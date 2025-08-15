import express, { Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import Stripe from 'stripe';
import { supabase } from './supabaseClient';

// --- Initial Setup ---
dotenv.config();

const app = express();
const port = Number(process.env.PORT ?? 8000);
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// --- Environment Variable Validation ---
const requiredEnv = ['SUPABASE_URL', 'SUPABASE_SERVICE_KEY', 'JWT_SECRET', 'STRIPE_SECRET_KEY', 'STRIPE_PRICE_ID'];
for (const key of requiredEnv) {
  if (!process.env[key]) {
    console.error(`FATAL ERROR: Missing environment variable: ${key}`);
    process.exit(1);
  }
}
const JWT_SECRET = process.env.JWT_SECRET!;
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

// --- Type Definitions ---
interface AuthenticatedRequest extends Request {
  user?: { userId: string; email: string; };
}

// --- WebSocket Logic ---
function broadcast(data: object) {
  console.log('Broadcasting WebSocket message:', data); // <-- ADD THIS LINE
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  });
}

wss.on('connection', (ws) => {
  console.log('Client connected to WebSocket');
  ws.on('close', () => console.log('Client disconnected'));
});

// --- Middleware ---
app.use(cors());

// Stripe webhook must be before express.json() to receive the raw body


app.use(express.json());

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB limit

const authenticateToken = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Authorization token missing' });

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) {
      if (err.name === 'TokenExpiredError') return res.status(401).json({ error: 'Token expired' });
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// --- General & Auth Routes ---
app.get('/', (_req: Request, res: Response) => res.send('Backend Server is Running!'));

app.post('/signup', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });
    try {
        const password_hash = await bcrypt.hash(password, 10);
        const { data, error } = await supabase.from('users').insert({ email, password_hash }).select('id, email, created_at').single();
        if (error) {
            if (error.code === '23505') return res.status(409).json({ error: 'User with this email already exists' });
            throw error;
        }
        res.status(201).json({ message: 'User created successfully', user: data });
    } catch (err) {
        console.error('Signup error:', err);
        res.status(500).json({ error: 'An unexpected error occurred' });
    }
});

app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });
    try {
        const { data: user, error } = await supabase.from('users').select('id, password_hash').eq('email', email).single();
        if (error || !user) return res.status(404).json({ error: 'User not found' });
        const isPasswordCorrect = await bcrypt.compare(password, user.password_hash);
        if (!isPasswordCorrect) return res.status(401).json({ error: 'Invalid credentials' });
        const token = jwt.sign({ userId: user.id, email: email }, JWT_SECRET, { expiresIn: '24h' });
        res.json({ message: 'Login successful', token });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'An unexpected error occurred' });
    }
});

// --- Protected Content Routes ---
app.get('/profile', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { data: user, error } = await supabase.from('users').select('id, email, subscription_status').eq('id', req.user!.userId).single();
        if (error) throw error;
        res.json(user);
    } catch (error) { res.status(500).json({ error: "Failed to fetch user profile." }); }
});

app.get('/browse', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    const user_id = req.user!.userId;
    const parent_id = (req.query.folderId as string) || null;
    try {
        const { data, error } = await supabase.rpc('get_user_content', { user_id_param: user_id, parent_id_param: parent_id, page_limit: 100, page_offset: 0 });
        if (error) throw error;
        const folders = data.filter((item: any) => item.type === 'folder');
        const files = data.filter((item: any) => item.type === 'file');
        res.json({ folders, files });
    } catch (err) {
        console.error('Browse error:', err);
        res.status(500).json({ error: 'Failed to retrieve content.' });
    }
});

app.get('/search', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    const query = (req.query.q as string) ?? '';
    if (!query.trim()) return res.status(400).json({ error: 'Search query is required.' });
    const formattedQuery = query.trim().split(/\s+/).join(' & ');
    try {
        const [filesResult, foldersResult] = await Promise.all([
            supabase.from('files').select('*').eq('owner_id', req.user!.userId).eq('is_deleted', false).textSearch('fts', formattedQuery),
            supabase.from('folders').select('*').eq('owner_id', req.user!.userId).eq('is_deleted', false).textSearch('fts', formattedQuery)
        ]);
        if (filesResult.error) throw filesResult.error;
        if (foldersResult.error) throw foldersResult.error;
        res.json({ files: filesResult.data, folders: foldersResult.data });
    } catch (err) {
        console.error('Search error:', err);
        res.status(500).json({ error: 'An error occurred during search.' });
    }
});

app.get('/trash', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    const owner_id = req.user!.userId;
    try {
        const { data: files } = await supabase.from('files').select('*').eq('owner_id', owner_id).eq('is_deleted', true);
        const { data: folders } = await supabase.from('folders').select('*').eq('owner_id', owner_id).eq('is_deleted', true);
        res.json({ files, folders });
    } catch (error) {
        console.error('Error fetching trash:', error);
        res.status(500).json({ error: 'Failed to retrieve trashed items.' });
    }
});

app.get('/stars', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    const user_id = req.user!.userId;
    try {
        const { data: starred } = await supabase.from('stars').select('resource_id').eq('user_id', user_id);
        if (!starred) return res.json({ files: [], folders: [] });
        const resourceIds = starred.map(s => s.resource_id);
        if (resourceIds.length === 0) return res.json({ files: [], folders: [] });
        const { data: files } = await supabase.from('files').select('*').in('id', resourceIds);
        const { data: folders } = await supabase.from('folders').select('*').in('id', resourceIds);
        res.json({ files, folders });
    } catch (err) {
        console.error('Error fetching starred items:', err);
        res.status(500).json({ error: 'Failed to fetch starred items.' });
    }
});

app.get('/recent', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    const user_id = req.user!.userId;
    try {
        const { data, error } = await supabase.rpc('get_recent_files', { user_id_param: user_id });
        if (error) throw error;
        res.json(data);
    } catch (err) {
        console.error('Error fetching recent files:', err);
        res.status(500).json({ error: 'Failed to retrieve recent files.' });
    }
});

app.get('/shared-with-me', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    const user_id = req.user!.userId;
    try {
        const { data, error } = await supabase.rpc('get_shared_content', { user_id_param: user_id });
        if (error) throw error;
        const files = (data || []).filter((item: any) => item.type === 'file');
        const folders = (data || []).filter((item: any) => item.type === 'folder');
        res.json({ files, folders });
    } catch (err) {
        console.error('Failed to retrieve shared content:', err);
        res.status(500).json({ error: 'Failed to retrieve shared content.' });
    }
});

// --- File & Sharing Routes ---
app.post('/files/upload', authenticateToken, upload.single('file'), async (req: AuthenticatedRequest, res: Response) => {
    const user = req.user!;
    const file = req.file;
    const { folder_id = null } = req.body;
    if (!file) return res.status(400).json({ error: 'No file uploaded.' });

    const filePath = `${user.userId}/${Date.now()}-${file.originalname}`;
    try {
        const { error: uploadError } = await supabase.storage.from('files').upload(filePath, file.buffer, { contentType: file.mimetype });
        if (uploadError) throw uploadError;
        const { data: fileData, error: dbError } = await supabase.from('files').insert({ name: file.originalname, storage_path: filePath, mime_type: file.mimetype, size: file.size, owner_id: user.userId, folder_id: folder_id }).select().single();
        if (dbError) {
            await supabase.storage.from('files').remove([filePath]);
            throw dbError;
        }
        broadcast({ type: 'FILE_CREATED', payload: { ...fileData, is_starred: false, type: 'file', item_id: fileData.id } });
        res.status(201).json({ message: 'File uploaded successfully', file: fileData });
    } catch (err) {
        console.error('File upload error:', err);
        res.status(500).json({ error: 'An error occurred during file upload.' });
    }
});

app.delete('/files/:fileId', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    const { fileId } = req.params;
    try {
        await supabase.from('files').update({ is_deleted: true, deleted_at: new Date().toISOString() }).eq('id', fileId).eq('owner_id', req.user!.userId);
        res.status(200).json({ message: 'File moved to trash.' });
    } catch (err) { res.status(500).json({ error: 'Failed to move file to trash.' }); }
});

app.patch('/files/:fileId/restore', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    const { fileId } = req.params;
    try {
        const { data, error } = await supabase.from('files').update({ is_deleted: false, deleted_at: null }).eq('id', fileId).eq('owner_id', req.user!.userId).select().single();
        if (error) throw error;
        res.json({ message: 'File restored successfully', file: data });
    } catch (err) { res.status(500).json({ error: 'Failed to restore file.' }); }
});

app.delete('/files/:fileId/permanent', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    const { fileId } = req.params;
    try {
        const { data: file } = await supabase.from('files').select('storage_path').eq('id', fileId).eq('owner_id', req.user!.userId).single();
        if (!file) throw new Error('File not found or user does not have permission.');
        await supabase.storage.from('files').remove([file.storage_path]);
        await supabase.from('files').delete().eq('id', fileId);
        res.status(200).json({ message: 'File permanently deleted.' });
    } catch (err) { res.status(500).json({ error: 'Failed to permanently delete file.' }); }
});

app.post('/files/:fileId/share', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    const { email: sharedWithEmail, role } = req.body;
    const { fileId } = req.params;
    const ownerId = req.user!.userId;
    if (!sharedWithEmail || !role || (role !== 'viewer' && role !== 'editor')) return res.status(400).json({ error: 'Valid email and role are required.' });
    try {
        const { data: file } = await supabase.from('files').select('id, owner_id').eq('id', fileId).single();
        if (!file || file.owner_id !== ownerId) return res.status(404).json({ error: 'File not found or you do not have permission.' });
        const { data: sharedWithUser } = await supabase.from('users').select('id').eq('email', sharedWithEmail).single();
        if (!sharedWithUser) return res.status(404).json({ error: `User with email ${sharedWithEmail} not found.` });
        if (sharedWithUser.id === ownerId) return res.status(400).json({ error: 'You cannot share a file with yourself.' });
        const { data, error } = await supabase.from('permissions').insert({ file_id: fileId, user_id: sharedWithUser.id, role }).select().single();
        if (error) {
            if (error.code === '23505') return res.status(409).json({ error: 'This file is already shared with the user.' });
            throw error;
        }
        res.status(201).json({ message: 'File shared successfully', permission: data });
    } catch (err) {
        console.error('Share file error:', err);
        res.status(500).json({ error: 'Failed to share file.' });
    }
});


// --- Folder Routes ---
app.post('/folders', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    const { name, parent_id = null } = req.body;
    if (!name) return res.status(400).json({ error: 'Folder name is required.' });
    try {
        const { data, error } = await supabase.from('folders').insert({ name, owner_id: req.user!.userId, parent_id }).select().single();
        if (error) throw error;
        res.status(201).json({ message: 'Folder created successfully', folder: data });
    } catch (err) { res.status(500).json({ error: 'Failed to create folder.' }); }
});

app.delete('/folders/:folderId', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    const { folderId } = req.params;
    try {
        await supabase.from('folders').update({ is_deleted: true, deleted_at: new Date().toISOString() }).eq('id', folderId).eq('owner_id', req.user!.userId);
        res.status(200).json({ message: 'Folder moved to trash.' });
    } catch (err) { res.status(500).json({ error: 'Failed to move folder to trash.' }); }
});

app.patch('/folders/:folderId/restore', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    const { folderId } = req.params;
    try {
        const { data, error } = await supabase.from('folders').update({ is_deleted: false, deleted_at: null }).eq('id', folderId).eq('owner_id', req.user!.userId).select().single();
        if (error) throw error;
        res.json({ message: 'Folder restored successfully', folder: data });
    } catch (err) { res.status(500).json({ error: 'Failed to restore folder.' }); }
});

app.delete('/folders/:folderId/permanent', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    const { folderId } = req.params;
    try {
        const { error } = await supabase.rpc('delete_folder_permanently', { p_folder_id: folderId, p_owner_id: req.user!.userId });
        if (error) throw error;
        res.status(200).json({ message: 'Folder and its contents permanently deleted.' });
    } catch (err) { res.status(500).json({ error: 'Failed to permanently delete folder.' }); }
});

app.get('/folders/:folderId/breadcrumbs', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    const { folderId } = req.params;
    try {
        const { data, error } = await supabase.rpc('get_folder_breadcrumbs', { p_folder_id: folderId });
        if (error) throw error;
        res.json(data);
    } catch (err) {
        console.error('Breadcrumbs error:', err);
        res.status(500).json({ error: 'Failed to retrieve breadcrumbs.' });
    }
});


// --- Permission Routes ---
app.get('/files/:fileId/permissions', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    const { fileId } = req.params;
    try {
        const { count } = await supabase.from('files').select('*', { count: 'exact', head: true }).eq('id', fileId).eq('owner_id', req.user!.userId);
        if (count === 0) return res.status(404).json({ error: 'File not found or you do not have permission.' });
        const { data, error } = await supabase.from('permissions').select(`id, role, users ( email )`).eq('file_id', fileId);
        if (error) throw error;
        res.json(data);
    } catch (err) {
        console.error('Get permissions error:', err);
        res.status(500).json({ error: 'Failed to retrieve permissions.' });
    }
});

app.patch('/permissions/:permissionId', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    const { permissionId } = req.params;
    const { role } = req.body;
    try {
        const { data, error } = await supabase.rpc('update_permission', { p_permission_id: permissionId, p_user_id: req.user!.userId, p_new_role: role });
        if (error || !data || data.length === 0) return res.status(404).json({ error: 'Permission not found or you do not have access.' });
        res.json({ message: 'Permission updated successfully', permission: data[0] });
    } catch (err) {
        console.error('Update permission error:', err);
        res.status(500).json({ error: 'Failed to update permission.' });
    }
});

app.delete('/permissions/:permissionId', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    const { permissionId } = req.params;
    try {
        const { data, error } = await supabase.rpc('delete_permission', { p_permission_id: permissionId, p_user_id: req.user!.userId });
        if (error || !data || data.length === 0) return res.status(404).json({ error: 'Permission not found or you do not have access.' });
        res.status(200).json({ message: 'Permission removed successfully.' });
    } catch (err) {
        console.error('Delete permission error:', err);
        res.status(500).json({ error: 'Failed to remove permission.' });
    }
});


// --- Star Routes ---
app.post('/stars', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    const { resourceId, resourceType } = req.body;
    if (!resourceId || !resourceType) return res.status(400).json({ error: 'Resource ID and type are required.' });
    try {
        const { data, error } = await supabase.from('stars').insert({ user_id: req.user!.userId, resource_id: resourceId, resource_type: resourceType }).select().single();
        if (error) throw error;
        res.status(201).json(data);
    } catch (err) {
        res.status(500).json({ error: 'Failed to star item.' });
    }
});

app.delete('/stars', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    const { resourceId } = req.body;
    try {
        const { error } = await supabase.from('stars').delete().eq('user_id', req.user!.userId).eq('resource_id', resourceId);
        if (error) throw error;
        res.status(200).json({ message: 'Item unstarred.' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to unstar item.' });
    }
});


// --- Stripe Routes ---
app.post('/create-checkout-session', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    const user_id = req.user!.userId;
    try {
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [{ price: process.env.STRIPE_PRICE_ID!, quantity: 1, }],
            mode: 'subscription',
            success_url: `http://localhost:3000/dashboard?payment_success=true`,
            cancel_url: `http://localhost:3000/dashboard?payment_canceled=true`,
            client_reference_id: user_id, 
        });
        res.json({ url: session.url });
    } catch (error: any) {
        console.error("Stripe error:", error.message);
        res.status(500).json({ error: 'Failed to create checkout session.' });
    }
});

// --- Start Server ---
server.listen(port, () => {
  console.log(`🚀 Server is listening on http://localhost:${port}`);
});

export default app;
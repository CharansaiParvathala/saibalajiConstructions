import path from 'path';

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
 
// ... rest of the server code ... 
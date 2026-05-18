import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

//middleware yay 
app.use(cors());
app.use(express.json());

//health check route
app.get('/health', (req, res) => {
    res.json({ status: 'ok', message: 'Clinic API is running'});
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

export default app;
import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';
import { logAudit } from '../utils/auditLogger';

const router = Router();
const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'arbaa-crm-super-secret-key-2026';

// Rate Limiter for Auth Routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // Limit each IP to 30 requests per window
  message: { error: 'تم تجاوز الحد الأقصى لمحاولات تسجيل الدخول. يرجى المحاولة بعد 15 دقيقة.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiter to auth paths
router.use('/login', authLimiter);
router.use('/register', authLimiter);
router.use('/recover', authLimiter);

// 1. Register User
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, roleName } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'يرجى إدخال جميع البيانات المطلوبة.' });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'البريد الإلكتروني مسجل بالفعل.' });
    }

    // Default to SALES_MANAGER if no role provided or restricted roles
    const targetRoleName = roleName || 'SALES_MANAGER';
    
    // Find role in database
    const role = await prisma.role.findUnique({ where: { name: targetRoleName } });
    if (!role) {
      return res.status(400).json({ error: 'الدور المحدد غير صالح.' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        password: passwordHash,
        roleId: role.id,
        status: 'ACTIVE',
      },
    });

    // Create Audit Log
    await logAudit({
      userId: newUser.id,
      userName: newUser.name,
      action: 'USER_REGISTER',
      entity: 'USER',
      details: { email: newUser.email, role: targetRoleName },
      ipAddress: req.ip || '',
      userAgent: req.headers['user-agent'] || '',
      severity: 'INFO',
    });

    // Generate JWT
    const token = jwt.sign({ id: newUser.id, email: newUser.email }, JWT_SECRET, {
      expiresIn: '7d',
    });

    return res.status(201).json({
      token,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        roleName: targetRoleName,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'حدث خطأ أثناء تسجيل الحساب.' });
  }
});

// 2. Login User
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'يرجى إدخال البريد الإلكتروني وكلمة المرور.' });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: { role: true },
    });

    if (!user) {
      return res.status(400).json({ error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة.' });
    }

    if (user.status !== 'ACTIVE') {
      return res.status(403).json({ error: 'تم تعطيل هذا الحساب. يرجى مراجعة المسؤولين.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة.' });
    }

    // Generate JWT
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, {
      expiresIn: '7d',
    });

    // Create Audit Log
    await logAudit({
      userId: user.id,
      userName: user.name,
      action: 'USER_LOGIN',
      entity: 'USER',
      details: { email: user.email },
      ipAddress: req.ip || '',
      userAgent: req.headers['user-agent'] || '',
      severity: 'INFO',
    });

    return res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        roleName: user.role.name,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'حدث خطأ أثناء تسجيل الدخول.' });
  }
});

// 3. Password Recovery (Mock)
router.post('/recover', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'يرجى إدخال البريد الإلكتروني.' });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(404).json({ error: 'البريد الإلكتروني غير مسجل في النظام.' });
    }

    // Since this is a local mock CRM, we just reset it to default password and notify the user
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('admin123', salt);
    
    await prisma.user.update({
      where: { email },
      data: { password: passwordHash },
    });

    await logAudit({
      userId: user.id,
      userName: user.name,
      action: 'PASSWORD_RESET',
      entity: 'USER',
      details: { message: 'Password recovery triggered. Password reset to default admin123' },
      ipAddress: req.ip || '',
      userAgent: req.headers['user-agent'] || '',
      severity: 'WARNING',
    });

    return res.json({
      message: 'تم إعادة تعيين كلمة المرور بنجاح إلى: admin123. يرجى استخدامها لتسجيل الدخول وتغييرها لاحقاً.',
    });
  } catch (error) {
    return res.status(500).json({ error: 'حدث خطأ أثناء استعادة كلمة المرور.' });
  }
});

// 4. Get Current User Details
router.get('/me', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'غير مصرح للوصول.' });
    }
    return res.json({ user: req.user });
  } catch (error) {
    return res.status(500).json({ error: 'حدث خطأ في جلب بيانات الجلسة.' });
  }
});

export default router;

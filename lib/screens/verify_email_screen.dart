import 'dart:async';
import 'package:flutter/material.dart';
import '../services/auth_service.dart';
import 'home_screen.dart';
import 'login_screen.dart';

class VerifyEmailScreen extends StatefulWidget {
  final String? userEmail;

  const VerifyEmailScreen({super.key, this.userEmail});

  @override
  State<VerifyEmailScreen> createState() => _VerifyEmailScreenState();
}

class _VerifyEmailScreenState extends State<VerifyEmailScreen> {
  final AuthService _authService = AuthService();
  
  bool _isChecking = false;
  bool _isResending = false;
  String? _message;
  bool _isSuccess = false;

  int _resendCooldown = 60;
  Timer? _cooldownTimer;
  Timer? _autoCheckTimer;

  @override
  void initState() {
    super.initState();
    _startCooldownTimer();

    // فحص دوري تلقائي كل 4 ثوانٍ للتحقق إن كان المستخدم قد ضغط على الرابط في بريده
    _autoCheckTimer = Timer.periodic(const Duration(seconds: 4), (_) {
      _checkVerificationStatus(isSilent: true);
    });
  }

  void _startCooldownTimer() {
    setState(() => _resendCooldown = 60);
    _cooldownTimer?.cancel();
    _cooldownTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (_resendCooldown > 0) {
        setState(() => _resendCooldown--);
      } else {
        _cooldownTimer?.cancel();
      }
    });
  }

  @override
  void dispose() {
    _cooldownTimer?.cancel();
    _autoCheckTimer?.cancel();
    super.dispose();
  }

  // فحص حالة التفعيل
  Future<void> _checkVerificationStatus({bool isSilent = false}) async {
    if (!isSilent) {
      setState(() {
        _isChecking = true;
        _message = null;
      });
    }

    final isVerified = await _authService.checkEmailVerified();

    if (isVerified && mounted) {
      _autoCheckTimer?.cancel();
      _cooldownTimer?.cancel();

      setState(() {
        _isChecking = false;
        _isSuccess = true;
        _message = 'تهانينا! تم تأكيد بريدك الإلكتروني بنجاح.';
      });

      // الانتقال إلى الشاشة الرئيسية لسوق الولي
      await Future.delayed(const Duration(milliseconds: 900));
      if (mounted) {
        Navigator.pushAndRemoveUntil(
          context,
          MaterialPageRoute(builder: (context) => const HomeScreen()),
          (route) => false,
        );
      }
    } else if (!isSilent && mounted) {
      setState(() {
        _isChecking = false;
        _isSuccess = false;
        _message = 'لم يتم تفعيل البريد بعد. يرجى فتح الرسالة المرسلة والضغط على رابط التفعيل.';
      });
    }
  }

  // إعادة إرسال رابط التفعيل
  Future<void> _handleResendEmail() async {
    if (_resendCooldown > 0 || _isResending) return;

    setState(() {
      _isResending = true;
      _message = null;
    });

    try {
      await _authService.sendEmailVerification();
      _startCooldownTimer();

      if (mounted) {
        setState(() {
          _isResending = false;
          _isSuccess = true;
          _message = 'تمت إعادة إرسال رابط التفعيل إلى بريدك الإلكتروني.';
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isResending = false;
          _isSuccess = false;
          _message = e.toString();
        });
      }
    }
  }

  // تسجيل الخروج
  Future<void> _handleLogout() async {
    _autoCheckTimer?.cancel();
    _cooldownTimer?.cancel();
    await _authService.logout();
    if (mounted) {
      Navigator.pushAndRemoveUntil(
        context,
        MaterialPageRoute(builder: (context) => const LoginScreen()),
        (route) => false,
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    const primaryColor = Color(0xFF0D3B66);
    const goldColor = Color(0xFFD4AF37);
    final email = widget.userEmail ?? _authService.currentUser?.email ?? 'بريدك الإلكتروني';

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Text('تفعيل الحساب', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
        centerTitle: true,
        backgroundColor: Colors.transparent,
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.logout_rounded, color: Colors.redAccent),
            tooltip: 'تسجيل الخروج',
            onPressed: _handleLogout,
          )
        ],
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 20.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const SizedBox(height: 20),

              // الأيقونة المتحركة للتفعيل
              Center(
                child: Container(
                  width: 100,
                  height: 100,
                  decoration: BoxDecoration(
                    color: goldColor.withOpacity(0.15),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(
                    Icons.mark_email_unread_rounded,
                    size: 54,
                    color: Color(0xFFB45309),
                  ),
                ),
              ),
              const SizedBox(height: 24),

              const Text(
                'فعل بريدك الإلكتروني',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.bold,
                  color: Color(0xFF0F172A),
                ),
              ),
              const SizedBox(height: 10),

              const Text(
                'أرسلنا رابط تفعيل رسمي إلى عنوان بريدك الإلكتروني:',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 14, color: Color(0xFF64748B)),
              ),
              const SizedBox(height: 8),

              // بطاقة عرض الإيميل المستهدف
              Container(
                padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 16),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: const Color(0xFFE2E8F0)),
                ),
                child: Text(
                  email,
                  textAlign: TextAlign.center,
                  textDirection: TextDirection.ltr,
                  style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.bold,
                    color: primaryColor,
                  ),
                ),
              ),
              const SizedBox(height: 16),

              // رسالة الحالة التنبيهية
              if (_message != null) ...[
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: _isSuccess ? Colors.green.shade50 : Colors.red.shade50,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: _isSuccess ? Colors.green.shade200 : Colors.red.shade200,
                    ),
                  ),
                  child: Row(
                    children: [
                      Icon(
                        _isSuccess ? Icons.check_circle_outline : Icons.info_outline,
                        color: _isSuccess ? Colors.green.shade700 : Colors.red.shade700,
                        size: 20,
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          _message!,
                          style: TextStyle(
                            color: _isSuccess ? Colors.green.shade800 : Colors.red.shade800,
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
              ],

              // تعليمات التفعيل
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.blue.shade50.withOpacity(0.5),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: Colors.blue.shade100),
                ),
                child: const Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Icon(Icons.lightbulb_outline, color: primaryColor, size: 20),
                        SizedBox(width: 8),
                        Text(
                          'خطوات إكمال التفعيل:',
                          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: primaryColor),
                        ),
                      ],
                    ),
                    SizedBox(height: 8),
                    Text(
                      '1. افتح تطبيق البريد (Gmail أو Outlook) على هاتفك.\n'
                      '2. افتح رسالة "سوق الولي" واضغط على رابط التفعيل.\n'
                      '3. ارجع هنا وسيتعرف التطبيق على تفعيلك تلقائياً.',
                      style: TextStyle(fontSize: 12.5, color: Color(0xFF334155), height: 1.6),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 28),

              // 1. زر الفحص اليدوي
              ElevatedButton(
                onPressed: _isChecking ? null : () => _checkVerificationStatus(isSilent: false),
                style: ElevatedButton.styleFrom(
                  backgroundColor: primaryColor,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  elevation: 2,
                ),
                child: _isChecking
                    ? const SizedBox(
                        height: 22,
                        width: 22,
                        child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2.5),
                      )
                    : const Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.refresh_rounded),
                          SizedBox(width: 8),
                          Text('لقد قمت بالتفعيل (فحص الآن)', style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold)),
                        ],
                      ),
              ),
              const SizedBox(height: 12),

              // 2. زر إعادة إرسال رابط التفعيل
              OutlinedButton(
                onPressed: _resendCooldown == 0 && !_isResending ? _handleResendEmail : null,
                style: OutlinedButton.styleFrom(
                  foregroundColor: primaryColor,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  side: BorderSide(color: _resendCooldown > 0 ? Colors.grey.shade300 : primaryColor),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                ),
                child: _isResending
                    ? const SizedBox(
                        height: 18,
                        width: 18,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : Text(
                        _resendCooldown > 0
                            ? 'إعادة إرسال الرابط بعد ($_resendCooldown ثانية)'
                            : 'إعادة إرسال بريد التفعيل',
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.bold,
                          color: _resendCooldown > 0 ? Colors.grey : primaryColor,
                        ),
                      ),
              ),
              const SizedBox(height: 16),

              // زر تسجيل الخروج والتبديل
              TextButton(
                onPressed: _handleLogout,
                child: const Text(
                  'استخدام بريد إلكتروني آخر أو تسجيل الخروج',
                  style: TextStyle(color: Color(0xFF64748B), fontSize: 13),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

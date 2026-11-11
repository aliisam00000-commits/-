import 'package:firebase_auth/firebase_auth.dart';
import 'package:cloud_firestore/cloud_firestore.dart';

class AuthService {
  final FirebaseAuth _auth = FirebaseAuth.instance;
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  // الحصول على المستخدم الحالي
  User? get currentUser => _auth.currentUser;

  // الاستماع لحالة تسجيل الدخول
  Stream<User?> get authStateChanges => _auth.authStateChanges();

  // 1. تسجيل مستخدم جديد بالبريد الإلكتروني وكلمة المرور
  Future<UserCredential> registerWithEmail({
    required String name,
    required String email,
    required String password,
    required String phone,
    required String neighborhood,
  }) async {
    try {
      // 1.1 إنشاء الحساب في Firebase Auth
      final userCredential = await _auth.createUserWithEmailAndPassword(
        email: email.trim(),
        password: password,
      );

      final user = userCredential.user;

      if (user != null) {
        // تحديث اسم المستخدم في Firebase Auth
        await user.updateDisplayName(name.trim());

        // 1.2 إرسال بريد التفعيل تلقائياً
        await user.sendEmailVerification();

        // 1.3 حفظ البيانات المبدئية في Firestore مع حالة isVerified: false
        await _firestore.collection('users').doc(user.uid).set({
          'uid': user.uid,
          'name': name.trim(),
          'email': email.trim().toLowerCase(),
          'phone': phone.trim(),
          'neighborhood': neighborhood,
          'village': 'الولي',
          'isVerified': false,
          'createdAt': FieldValue.serverTimestamp(),
          'updatedAt': FieldValue.serverTimestamp(),
        }, SetOptions(merge: true));
      }

      return userCredential;
    } on FirebaseAuthException catch (e) {
      throw getArabicAuthErrorMessage(e.code);
    } catch (e) {
      throw 'حدث خطأ غير متوقع أثناء التسجيل: ${e.toString()}';
    }
  }

  // 2. تسجيل الدخول بالبريد الإلكتروني وكلمة المرور
  Future<UserCredential> loginWithEmail({
    required String email,
    required String password,
  }) async {
    try {
      final userCredential = await _auth.signInWithEmailAndPassword(
        email: email.trim(),
        password: password,
      );
      
      // عمل تحديث للمستخدم لمعرفة حالة التفعيل اللحظية
      await userCredential.user?.reload();
      
      // إذا كان البريد مفعلاً، نقوم بتحديث الـ Firestore
      if (userCredential.user?.emailVerified == true) {
        await markUserAsVerifiedInFirestore(userCredential.user!.uid);
      }

      return userCredential;
    } on FirebaseAuthException catch (e) {
      throw getArabicAuthErrorMessage(e.code);
    } catch (e) {
      throw 'تعذر تسجيل الدخول: ${e.toString()}';
    }
  }

  // 3. إعادة إرسال بريد التفعيل
  Future<void> sendEmailVerification() async {
    try {
      final user = _auth.currentUser;
      if (user != null && !user.emailVerified) {
        await user.sendEmailVerification();
      }
    } on FirebaseAuthException catch (e) {
      throw getArabicAuthErrorMessage(e.code);
    } catch (e) {
      throw 'تعذر إرسال رابط التفعيل: ${e.toString()}';
    }
  }

  // 4. التحقق من حالة تفعيل الإيميل وتحديث Firestore بعد التفعيل
  Future<bool> checkEmailVerified() async {
    try {
      final user = _auth.currentUser;
      if (user == null) return false;

      // إعادة تحميل بيانات المستخدم من السيرفر للتأكد من حالة الضغط على الرابط
      await user.reload();
      final updatedUser = _auth.currentUser;

      if (updatedUser != null && updatedUser.emailVerified) {
        // تحديث المستند في Firestore ليصبح isVerified: true
        await markUserAsVerifiedInFirestore(updatedUser.uid);
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  }

  // 5. تحديث حالة المستخدم في Firestore بعد التفعيل
  Future<void> markUserAsVerifiedInFirestore(String uid) async {
    try {
      await _firestore.collection('users').doc(uid).set({
        'isVerified': true,
        'verifiedAt': FieldValue.serverTimestamp(),
        'updatedAt': FieldValue.serverTimestamp(),
      }, SetOptions(merge: true));
    } catch (e) {
      // قد يفشل لو كانت قواعد الأمان تتطلب تفعيل الإيميل
    }
  }

  // 6. استعادة كلمة المرور (Forgot Password)
  Future<void> sendPasswordResetEmail(String email) async {
    try {
      await _auth.sendPasswordResetEmail(email: email.trim());
    } on FirebaseAuthException catch (e) {
      throw getArabicAuthErrorMessage(e.code);
    } catch (e) {
      throw 'تعذر إرسال رابط استعادة كلمة المرور: ${e.toString()}';
    }
  }

  // 7. تسجيل الخروج
  Future<void> logout() async {
    await _auth.signOut();
  }

  // دالة مساعدة لترجمة أكواد الأخطاء الشائعة إلى اللغة العربية بدقة
  static String getArabicAuthErrorMessage(String errorCode) {
    switch (errorCode) {
      case 'email-already-in-use':
        return 'البريد الإلكتروني مستخدم بالفعل بحساب آخر.';
      case 'invalid-email':
        return 'صيغة البريد الإلكتروني غير صحيحة.';
      case 'weak-password':
        return 'كلمة السر ضعيفة، يرجى إدخال 6 أحرف أو أرقام على الأقل.';
      case 'user-not-found':
        return 'لا يوجد حساب مسجل بهذا البريد الإلكتروني.';
      case 'wrong-password':
      case 'invalid-credential':
        return 'كلمة المرور أو البريد الإلكتروني غير صحيح.';
      case 'user-disabled':
        return 'تم تعطيل هذا الحساب من قبل الإدارة.';
      case 'too-many-requests':
        return 'تم تجاوز عدد المحاولات المسموح به. يرجى الانتظار دقيقة والمحاولة مجدداً.';
      case 'network-request-failed':
        return 'تعذر الاتصال بالشبكة. يرجى التحقق من اتصال الإنترنت.';
      default:
        return 'حدث خطأ في المصادقة ($errorCode). يرجى المحاولة مرة أخرى.';
    }
  }
}

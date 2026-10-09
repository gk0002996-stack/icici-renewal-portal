/**
 * Mobile Device & Browser Detection Utility
 * Specifically checks for mobile browsers (such as Google Chrome on Android)
 * and capability for WebOTP API (navigator.credentials.get({ otp: { transport: ['sms'] } }))
 */

export interface DeviceInfo {
  deviceCategory: 'Mobile' | 'Desktop' | 'Tablet';
  browserCategory: string;
  os: string;
  isMobile: boolean;
  supportsWebOtp: boolean;
  userAgent: string;
}

export function detectDeviceInfo(): DeviceInfo {
  if (typeof window === 'undefined' || !navigator) {
    return {
      deviceCategory: 'Desktop',
      browserCategory: 'Desktop Browser',
      os: 'Unknown',
      isMobile: false,
      supportsWebOtp: false,
      userAgent: ''
    };
  }

  const ua = navigator.userAgent || '';
  const uaLower = ua.toLowerCase();

  // Tablet detection
  const isTablet = /(ipad|tablet|(android(?!.*mobile))|(windows(?!.*phone)(.*touch))|kindle|playbook|silk)/i.test(ua);

  // Mobile detection
  const isMobileUa = /(android.*mobile|iphone|ipod|blackberry|iemobile|opera mini|mobile|windows phone)/i.test(ua);
  
  // Touch point & screen size check
  const hasTouch = navigator.maxTouchPoints > 0;
  const isSmallScreen = window.innerWidth <= 768;
  const isMobile = (isMobileUa || (hasTouch && isSmallScreen)) && !isTablet;
  const deviceCategory: 'Mobile' | 'Desktop' | 'Tablet' = isTablet ? 'Tablet' : isMobile ? 'Mobile' : 'Desktop';

  // OS detection
  let os = 'Unknown OS';
  if (/android/i.test(ua)) os = 'Android';
  else if (/iphone|ipad|ipod/i.test(ua)) os = 'iOS';
  else if (/windows nt/i.test(ua)) os = 'Windows';
  else if (/macintosh|mac os x/i.test(ua)) os = 'macOS';
  else if (/linux/i.test(ua)) os = 'Linux';

  // Browser detection
  let browserCategory = 'Web Browser';
  if (/edg\//i.test(ua)) {
    browserCategory = isMobile ? 'Edge Mobile' : 'Microsoft Edge';
  } else if (/samsungbrowser/i.test(ua)) {
    browserCategory = 'Samsung Internet';
  } else if (/opr\/|opera/i.test(ua)) {
    browserCategory = isMobile ? 'Opera Mobile' : 'Opera';
  } else if (/chrome|crios/i.test(ua)) {
    browserCategory = isMobile ? 'Chrome for Android' : 'Desktop Chrome';
  } else if (/firefox|fxios/i.test(ua)) {
    browserCategory = isMobile ? 'Firefox Mobile' : 'Mozilla Firefox';
  } else if (/safari/i.test(ua) && !/chrome|crios/i.test(ua)) {
    browserCategory = isMobile ? 'Mobile Safari' : 'Apple Safari';
  }

  // WebOTP API support check
  // WebOTP is supported in Chromium-based browsers on Android (Chrome 84+, Samsung Internet, Edge on Android)
  // Check 'OTPCredential' in window or navigator.credentials support
  const hasCredentials = typeof navigator.credentials !== 'undefined';
  const hasOtpCredential = typeof window !== 'undefined' && 'OTPCredential' in window;
  const isAndroidChrome = /android/i.test(ua) && /chrome/i.test(ua);
  const supportsWebOtp = hasOtpCredential || (hasCredentials && isAndroidChrome);

  return {
    deviceCategory,
    browserCategory,
    os,
    isMobile,
    supportsWebOtp,
    userAgent: ua
  };
}

export function isMobileOnly(): boolean {
  return detectDeviceInfo().isMobile;
}

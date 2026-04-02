// Web Vibration API wrapper
// Android Chrome対応。iOS Safariは navigator.vibrate が undefined のためサイレント無視。
export const haptics = {
  tap: () => navigator.vibrate?.(10),
  success: () => navigator.vibrate?.([10, 50, 10]),
  error: () => navigator.vibrate?.(200),
  combo: () => navigator.vibrate?.([10, 30, 10, 30, 20]),
};

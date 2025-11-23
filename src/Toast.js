import React, { useEffect } from 'react'

/**
 * Toast Component
 * 
 * Professional corner notifications like Slack/Linear
 * Auto-dismisses after 3 seconds
 */

const Toast = ({ message, type = 'success', onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose()
    }, 3000)

    return () => clearTimeout(timer)
  }, [onClose])

  const styles = {
    success: {
      bg: 'bg-green-600',
      icon: '✓',
      border: 'border-green-500'
    },
    error: {
      bg: 'bg-red-600',
      icon: '✕',
      border: 'border-red-500'
    },
    info: {
      bg: 'bg-blue-600',
      icon: 'ⓘ',
      border: 'border-blue-500'
    },
    warning: {
      bg: 'bg-yellow-600',
      icon: '⚠',
      border: 'border-yellow-500'
    }
  }

  const style = styles[type] || styles.success

  return (
    <div className="fixed top-4 right-4 z-50 animate-slide-in">
      <div className={`${style.bg} ${style.border} border-l-4 rounded-lg shadow-2xl p-4 min-w-[320px] max-w-md`}>
        <div className="flex items-start space-x-3">
          <span className="text-white text-xl flex-shrink-0 mt-0.5">{style.icon}</span>
          <div className="flex-1">
            <p className="text-white font-medium leading-snug">{message}</p>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white transition flex-shrink-0 ml-2"
          >
            <span className="text-lg">✕</span>
          </button>
        </div>
      </div>
    </div>
  )
}

// Toast Container to manage multiple toasts
export const ToastContainer = ({ toasts, removeToast }) => {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </div>
  )
}

export default Toast

// Add this to your global CSS (or create styles if needed):
// @keyframes slide-in {
//   from {
//     transform: translateX(400px);
//     opacity: 0;
//   }
//   to {
//     transform: translateX(0);
//     opacity: 1;
//   }
// }
// .animate-slide-in {
//   animation: slide-in 0.3s ease-out;
// }

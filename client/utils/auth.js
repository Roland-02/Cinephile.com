// Utility functions for authentication
export const getSession = () => {
  // Get session from cookies
  const cookies = document.cookie.split(';').reduce((acc, cookie) => {
    const [key, value] = cookie.trim().split('=');
    acc[key] = value;
    return acc;
  }, {});
  
  return {
    email: cookies.sessionEmail || null,
    id: cookies.sessionID || null,
  };
};

export const isAuthenticated = () => {
  const session = getSession();
  return !!(session.email && session.id);
};

export const signOut = async () => {
  try {
    await fetch('/api/signout', {
      method: 'POST',
      credentials: 'include',
    });
    window.location.href = '/';
  } catch {
  }
};


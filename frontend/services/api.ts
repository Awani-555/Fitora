import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE = 'http://10.218.229.130:5000/api'; // your ip addres and also change in the env in the backend


// ─── CORE REQUEST ─────────────────────────────────────────────────────────────
const request = async (endpoint: string, options: RequestInit = {}) => {
  const token = await AsyncStorage.getItem('fitora_token');
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };

  console.log(`[API] ${options.method || 'GET'} ${endpoint}`, token ? '✅ Token sent' : '❌ No token');

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: { ...headers, ...(options.headers || {}) }
  });

  const data = await res.json();
  
  if (!res.ok) {
    console.error(`[API Error] ${res.status}:`, data.message);
    throw new Error(data.message || `HTTP ${res.status}`);
  }
  
  return data;
};

export const auth = {
  register: async (name: string, email: string, password: string) => {
    const data = await request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password })
    });
    
    if (data.token) {
      await AsyncStorage.setItem('fitora_token', data.token);
      await AsyncStorage.setItem('fitora_user', JSON.stringify(data.user));
      console.log('[Auth] ✅ Registered & token saved');
    }
    
    return data;
  },

  login: async (email: string, password: string) => {
    const data = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    
    if (data.token) {
      await AsyncStorage.setItem('fitora_token', data.token);
      await AsyncStorage.setItem('fitora_user', JSON.stringify(data.user));
      console.log('[Auth] ✅ Logged in & token saved');
    }
    
    return data;
  },

  logout: async () => {
    await AsyncStorage.multiRemove(['fitora_token', 'fitora_user']);
    console.log('[Auth] ✅ Logged out');
  },

  getMe: () => request('/auth/me'),
  
  isLoggedIn: async () => {
    const token = await AsyncStorage.getItem('fitora_token');
    return !!token;
  }
};

export const wardrobe = {
  getAll: () => request('/wardrobe'),
  
  upload: async (imageUri: string, meta: any = {}) => {
    const token = await AsyncStorage.getItem('fitora_token');
    const form = new FormData();
    
    const fileName = imageUri.split('/').pop() || 'photo.jpg';
    const mimeType = fileName.endsWith('.png') ? 'image/png' : 'image/jpeg';
    
    form.append('image', {
      uri: imageUri,
      name: fileName,
      type: mimeType
    } as any);
    
    Object.entries(meta).forEach(([key, value]) => {
      if (value) form.append(key, value);
    });
    
    const res = await fetch(`${API_BASE}/wardrobe/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
        // NO Content-Type - React Native sets it with boundary
      },
      body: form
    });
    
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);
    
    console.log('[Wardrobe] ✅ Item uploaded');
    return data;
  },
  
  delete: (id: string) => request(`/wardrobe/${id}`, { method: 'DELETE' })
};

export const outfit = {
  getAll: () => request('/outfit'),
  
  generate: (params: { occasion: string; mood?: string }) => {
    console.log('[Outfit] Generating:', params);
    return request('/outfit/generate', {
      method: 'POST',
      body: JSON.stringify(params)
    });
  },
  
  analyze: async (imageUri: string) => {
    const token = await AsyncStorage.getItem('fitora_token');
    const form = new FormData();
    
    form.append('image', {
      uri: imageUri,
      name: 'outfit.jpg',
      type: 'image/jpeg'
    } as any);
    
    const res = await fetch(`${API_BASE}/outfit/analyze`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: form
    });
    
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);
    return data;
  },
  
  markWorn: (id: string) => request(`/outfit/${id}/wear`, { method: 'POST' })
};

export const chat = {
  send: (message: string, conversationId?: string) => {
    console.log('[Chat] Sending:', message);
    return request('/chat', {
      method: 'POST',
      body: JSON.stringify({ message, conversationId })
    });
  },
  
  getHistory: () => request('/chat/history')
};

export const shopping = {
  getSuggestions: () => request('/shopping')
};

export default { auth, wardrobe, outfit, chat, shopping };
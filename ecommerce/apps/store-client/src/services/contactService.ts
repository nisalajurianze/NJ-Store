import api from './api';

export const contactService = {
  send: async (payload: { name: string; email: string; message: string; website?: string }) => {
    await api.post('/contact', payload);
  }
};

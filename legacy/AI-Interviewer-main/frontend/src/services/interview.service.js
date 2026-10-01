/**
 * services/interview.service.js
 *
 * Interview and session API calls.
 * All methods return the data payload (already unwrapped from axios response).
 */

import api from '@/lib/axios';

export const interviewService = {
  create:            (payload)       => api.post('/interviews', payload),
  generateQuestions: (id)            => api.post(`/interviews/${id}/generate`),
  getAll:            (params)        => api.get('/interviews', { params }),
  getById:           (id)            => api.get(`/interviews/${id}`),
  delete:            (id)            => api.delete(`/interviews/${id}`),
};

export const sessionService = {
  start:        (interviewId)   => api.post('/sessions/start', { interviewId }),
  submitAnswer: (id, payload)   => api.post(`/sessions/${id}/answer`, payload),
  complete:     (id)            => api.post(`/sessions/${id}/complete`),
  getAll:       (params)        => api.get('/sessions', { params }),
  getById:      (id)            => api.get(`/sessions/${id}`),
};

export const resumeService = {
  upload:     (formData) => api.post('/resumes/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  getAll:     ()         => api.get('/resumes'),
  delete:     (id)       => api.delete(`/resumes/${id}`),
  setDefault: (id)       => api.patch(`/resumes/${id}/default`),
};

export const userService = {
  getProfile:     ()       => api.get('/users/profile'),
  updateProfile:  (data)   => api.put('/users/profile', data),
  changePassword: (data)   => api.put('/users/change-password', data),
  getDashboard:   ()       => api.get('/users/dashboard'),
};

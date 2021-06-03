import axios from 'axios';

export const instance = axios.create({ baseURL: 'http://localhost:8000' });

export const setAuthToken = (token) => {
  if (token) {
    //applying token
    instance.defaults.headers.common['Authorization'] = token;
  } else {
    //deleting the token from header
    delete instance.defaults.headers.common['Authorization'];
  }
};

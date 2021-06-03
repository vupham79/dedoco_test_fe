import firebase from 'firebase';

const firebaseConfig = {
  apiKey: 'AIzaSyAITAZF_5reM0WpsJGm7YQVOGrhcfMJQzA',
  authDomain: 'dedoco-test.firebaseapp.com',
  projectId: 'dedoco-test',
  storageBucket: 'dedoco-test.appspot.com',
  messagingSenderId: '207714426856',
  appId: '1:207714426856:web:999e633952c089f4ee8e5d',
};

firebase.initializeApp(firebaseConfig);

var storage = firebase.storage();

export default storage;

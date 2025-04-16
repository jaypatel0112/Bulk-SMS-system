import { useEffect, useState } from 'react';
import axios from 'axios';

function TestPage() {
  const [message, setMessage] = useState('');

  useEffect(() => {
    axios.get('http://localhost:3001/api/test')
      .then(res => setMessage(res.data.message))
      .catch(err => console.log(err));
  }, []);

  return <h1>{message}</h1>;
}

export default TestPage;

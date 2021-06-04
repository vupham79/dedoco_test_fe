import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';
import './App.css';
import Document from './containers/Document';
import SignIn from './containers/SignIn';
import SignUp from './containers/SignUp';

function App() {
  return (
    <Router>
      <Switch>
        <Route path="/" exact>
          <SignIn />
        </Route>
        <Route path="/signup">
          <SignUp />
        </Route>
        <Route path="/document">
          <Document />
        </Route>
      </Switch>
    </Router>
  );
}

export default App;

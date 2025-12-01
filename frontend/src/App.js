import { Auth0Provider } from "@auth0/auth0-react";
import Chatbot from "./Chatbot";

function App() {
  return (
    <Auth0Provider
      domain={process.env.REACT_APP_AUTH0_DOMAIN}
      clientId={process.env.REACT_APP_AUTH0_CLIENT_ID}
      authorizationParams={{
        redirect_uri: window.location.origin,
        audience: "https://nova-backend"
      }}
    >
      <Chatbot />
    </Auth0Provider>
  );
}

export default App;

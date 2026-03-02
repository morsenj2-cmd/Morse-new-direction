import { useAuth } from "@clerk/clerk-react";

export default function AuthGate({ children }) {
  const { isLoaded } = useAuth();

  if (!isLoaded) {
    return (
      <div style={{
        width: "100vw",
        height: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0b0f19",
        color: "white",
        fontSize: "18px"
      }}>
        Loading...
      </div>
    );
  }

  return children;
}

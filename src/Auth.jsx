import { useState } from "react";
import { auth, googleProvider } from "./firebase";
import {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut
} from "firebase/auth";

export function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState("");

  const loginGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      onLogin(result.user);
    } catch (e) { setError(e.message); }
  };

  const loginEmail = async () => {
    try {
      const fn = isRegister ? createUserWithEmailAndPassword : signInWithEmailAndPassword;
      const result = await fn(auth, email, password);
      onLogin(result.user);
    } catch (e) { setError(e.message); }
  };

  return (
    <div style={{
      minHeight: "100vh", background: "#07090e",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 20
    }}>
      <div style={{
        background: "#111520", border: "1px solid #1a2030",
        borderRadius: 18, padding: 36, width: "100%", maxWidth: 400
      }}>
        <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: 28, color: "#e6eaf2", marginBottom: 6 }}>
          TRACKR<span style={{ color: "#00ffd0" }}>.</span>
        </div>
        <div style={{ fontSize: 12, color: "#4a566e", marginBottom: 30 }}>
          {isRegister ? "Create your account" : "Sign in to your account"}
        </div>

        {/* Google Login */}
        <button onClick={loginGoogle} style={{
          width: "100%", padding: "12px", borderRadius: 10, border: "1px solid #1a2030",
          background: "#0d1018", color: "#e6eaf2", cursor: "pointer",
          fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 13,
          display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 20
        }}>
          <img src="https://www.google.com/favicon.ico" width={16} alt="G"/>
          Continue with Google
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
          <div style={{ flex: 1, height: 1, background: "#1a2030" }}/>
          <span style={{ fontSize: 11, color: "#4a566e" }}>or</span>
          <div style={{ flex: 1, height: 1, background: "#1a2030" }}/>
        </div>

        {/* Email/Password */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <input
            style={{ background: "#0d1018", border: "1px solid #1a2030", color: "#e6eaf2", padding: "10px 14px", borderRadius: 8, outline: "none", fontSize: 13 }}
            placeholder="Email address"
            value={email} onChange={e => setEmail(e.target.value)}
          />
          <input
            type="password"
            style={{ background: "#0d1018", border: "1px solid #1a2030", color: "#e6eaf2", padding: "10px 14px", borderRadius: 8, outline: "none", fontSize: 13 }}
            placeholder="Password"
            value={password} onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === "Enter" && loginEmail()}
          />
          {error && <div style={{ fontSize: 11, color: "#ff4d6d" }}>{error}</div>}
          <button onClick={loginEmail} style={{
            background: "#00ffd0", color: "#07090e", border: "none", borderRadius: 8,
            padding: "12px", fontFamily: "Syne, sans-serif", fontWeight: 700,
            fontSize: 13, cursor: "pointer"
          }}>
            {isRegister ? "Create Account" : "Sign In"}
          </button>
        </div>

        <div style={{ textAlign: "center", marginTop: 16, fontSize: 12, color: "#4a566e" }}>
          {isRegister ? "Already have an account? " : "Don't have an account? "}
          <span onClick={() => setIsRegister(!isRegister)}
            style={{ color: "#00ffd0", cursor: "pointer" }}>
            {isRegister ? "Sign in" : "Create one"}
          </span>
        </div>
      </div>
    </div>
  );
}

export function LogoutButton({ user, onLogout }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <img src={user.photoURL || ""} width={26} height={26}
        style={{ borderRadius: "50%", border: "2px solid #00ffd0" }}
        onError={e => e.target.style.display = "none"}
      />
      <span style={{ fontSize: 11, color: "#4a566e" }}>{user.email?.split("@")[0]}</span>
      <button onClick={() => signOut(auth).then(onLogout)}
        style={{ background: "#1a2030", border: "none", color: "#4a566e", padding: "5px 10px", borderRadius: 6, cursor: "pointer", fontSize: 11 }}>
        Sign Out
      </button>
    </div>
  );
}
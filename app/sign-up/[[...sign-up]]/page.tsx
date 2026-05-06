import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0a0a0f",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 24,
      }}
    >
      <div style={{ textAlign: "center", marginBottom: 8 }}>
        <div style={{ fontSize: 36, marginBottom: 8 }}>🚀</div>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "#fff", margin: 0 }}>
          PrepBuddy AI
        </h1>
        <p style={{ color: "#555", fontSize: 13, marginTop: 6 }}>
          Create your account
        </p>
      </div>
      <SignUp />
    </div>
  );
}

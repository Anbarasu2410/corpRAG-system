import React, { useState } from "react";
import { Input, Button, Card } from "antd";
import { useNavigate } from "react-router-dom";
import { login } from "../services/api";

const Login = ({ setToken }) => {
  const [form, setForm] = useState({});
  const navigate = useNavigate();

  const handleLogin = async () => {
    const res = await login(form);
    setToken(res.data.token);
    navigate("/chat");
  };

  return (
    <Card style={{ width: 300, margin: "100px auto" }}>
      <Input
        placeholder="username"
        onChange={(e) =>
          setForm({ ...form, username: e.target.value })
        }
      />
      <Input.Password
        placeholder="password"
        onChange={(e) =>
          setForm({ ...form, password: e.target.value })
        }
      />
      <Button onClick={handleLogin} type="primary" block>
        Login
      </Button>
    </Card>
  );
};

export default Login;
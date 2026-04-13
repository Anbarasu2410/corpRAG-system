import React from "react";
import { Layout, Button } from "antd";
import { useNavigate } from "react-router-dom";
import ChatBox from "../components/ChatBox.jsx";

const { Header, Content } = Layout;

const Chat = ({ token, setToken }) => {
  const navigate = useNavigate();

  const logout = () => {
    setToken(null);
    localStorage.removeItem("token");
    navigate("/");
  };

  return (
    <Layout>
      <Header style={{ color: "#fff" }}>
        Company Chatbot
        <Button onClick={logout} style={{ float: "right" }}>
          Logout
        </Button>
      </Header>
      <Content style={{ padding: 20 }}>
        <ChatBox token={token} />
      </Content>
    </Layout>
  );
};

export default Chat;
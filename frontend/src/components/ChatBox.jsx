import React, { useState } from "react";
import { Input, Button, List } from "antd";
import { sendMessage } from "../services/api";

const ChatBox = ({ token }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");

  const send = async () => {
    const res = await sendMessage(input, token);

    setMessages([
      ...messages,
      { user: input },
      { bot: res.data.reply },
    ]);

    setInput("");
  };

  return (
    <div>
      <List
        bordered
        dataSource={messages}
        renderItem={(item) => (
          <List.Item>
            {item.user || item.bot}
          </List.Item>
        )}
      />
      <Input value={input} onChange={(e) => setInput(e.target.value)} />
      <Button onClick={send}>Send</Button>
    </div>
  );
};

export default ChatBox;
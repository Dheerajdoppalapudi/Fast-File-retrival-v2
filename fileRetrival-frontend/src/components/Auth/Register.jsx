import React, { useState } from "react";
import { Form, Input, Select, Button, message, Card } from "antd";
import { useNavigate } from "react-router-dom";

const { Option } = Select;

const Register = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const onFinish = async (values) => {
    setLoading(true);
    try {
      const response = await fetch("http://localhost:8000/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      const data = await response.json();
      if (response.ok) {
        message.success("Registration successful!");
        navigate("/login");
      } else {
        message.error(data.message || "Registration failed");
      }
    } catch (error) {
      message.error("Something went wrong!");
    }
    setLoading(false);
  };

  return (
    <div style={{display: "flex", alignItems: "center", justifyContent: "center", height: "100vh"}}>
      <Card title="Register" bordered={false} style={{ width: 400 }}>
        <Form layout="vertical" onFinish={onFinish}>
          <Form.Item label="Username" name="username" rules={[{ required: true, message: "Enter username" }]}>
            <Input />
          </Form.Item>
          <Form.Item label="email" name="email" rules={[{ required: true, message: "Enter email" }]}>
            <Input />
          </Form.Item>
          <Form.Item label="Password" name="password" rules={[{ required: true, message: "Enter the password" }]}>
            <Input.Password />
          </Form.Item>
          <Form.Item label="Role" name="role" rules={[{ required: true, message: "Select a role" }]}>
            <Select placeholder="Select role">
              <Option value="VIEWER">VIEWER</Option>
              <Option value="EDITOR">EDITOR</Option>
              <Option value="ADMIN">ADMIN</Option>
            </Select>
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={loading} block>
            Register
          </Button>
        </Form>
      </Card>
    </div>
  );
};

export default Register;

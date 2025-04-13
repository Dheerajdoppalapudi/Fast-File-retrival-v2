import React, { useState } from "react";
import { Form, Input, Select, Button, message, Card, Typography, Divider } from "antd";
import { useNavigate, Link } from "react-router-dom";

const { Option } = Select;
const { Text } = Typography;

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
    <div style={{
      display: "flex", 
      alignItems: "center", 
      justifyContent: "center", 
      minHeight: "calc(100vh - 128px)", // Adjusting for header and footer
      padding: "20px"
    }}>
      <Card 
        title="Register" 
        bordered={true} // Changed to true to show borders
        style={{ 
          width: 400,
          border: "1px solid #e8e8e8", // Added visible border
          borderRadius: "4px" // Slight border radius for better appearance
        }}
      >
        <Form layout="vertical" onFinish={onFinish}>
          <Form.Item label="Username" name="username" rules={[{ required: true, message: "Enter username" }]}>
            <Input placeholder="Enter username" />
          </Form.Item>
          <Form.Item label="Email" name="email" rules={[{ required: true, message: "Enter email" }]}>
            <Input placeholder="Enter email" />
          </Form.Item>
          <Form.Item label="Password" name="password" rules={[{ required: true, message: "Enter the password" }]}>
            <Input.Password placeholder="Enter password" />
          </Form.Item>
          <Form.Item label="Role" name="role" rules={[{ required: true, message: "Select a role" }]}>
            <Select placeholder="Select role">
              <Option value="VIEWER">VIEWER</Option>
              <Option value="EDITOR">EDITOR</Option>
              <Option value="ADMIN">ADMIN</Option>
            </Select>
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block>
              Register
            </Button>
          </Form.Item>
        </Form>
        
        <Divider plain>
          <Text type="secondary">Already have an account?</Text>
        </Divider>
        
        <div style={{ textAlign: "center" }}>
          <Link to="/login">
            <Button type="default" block>
              Login Now
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );
};

export default Register;
import React, { useState, useEffect, useContext } from "react";
import { Modal, Select, Button, Avatar, Space, Typography, Divider, message, List, Tag } from "antd";
import { UserOutlined, DeleteOutlined, ShareAltOutlined } from "@ant-design/icons";
import { AuthContext } from "../context/AuthContext";
import { ThemeContext } from "../context/ThemeContext"; // Import ThemeContext
import axios from "axios";

const { Option } = Select;
const { Text, Title } = Typography;

const ShareModal = ({ visible, onCancel, folderName, path, content }) => {
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [permissionType, setPermissionType] = useState("READ");
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [cascadeToChildren, setCascadeToChildren] = useState(true);
  const { user } = useContext(AuthContext);
  const { theme } = useContext(ThemeContext); // Get current theme

  const isFolder = content?.isFolder;
  const resourceId = isFolder ? content?.directoryId || path : content?.fileId;
  const resourceType = isFolder ? "DIRECTORY" : "FILE";

  // Reset selected users when modal opens/closes
  useEffect(() => {
    if (!visible) {
      setSelectedUsers([]);
    }
    if (visible) {
      handleGetUserList();
    }
  }, [visible]);

  const handleGetUserList = async () => {
    try {
      const response = await axios.get('http://localhost:8000/permissions/get-user-list', {
        headers: { Authorization: `Bearer ${user?.token}` }
      });
      
      // Filter out the current user and users who already have access
      const currentUserId = user?.userId || user?.id;
      const filteredUsers = response.data.filter(u => u.id !== currentUserId);
      
      setUsers(filteredUsers);
    } catch (error) {
      console.error("Failed to fetch users:", error);
      message.error("Failed to load user list.");
    }
  };

  const handleShare = async () => {
    if (selectedUsers.length === 0) return;

    setLoading(true);

    try {
      // Process each selected user
      const promises = selectedUsers.map(userId => 
        axios.post("http://localhost:8000/permissions/grant", {
          userId,
          permissionType,
          resourceType,
          resourceId,
          cascadeToChildren: isFolder ? cascadeToChildren : false
        }, {
          headers: { Authorization: `Bearer ${user?.token}` }
        })
      );
      
      await Promise.all(promises);

      const userCount = selectedUsers.length;
      const userText = userCount === 1 
        ? getUserName(selectedUsers[0]) 
        : `${userCount} users`;
      
      message.success(`Shared "${folderName}" with ${userText} (${permissionType.toLowerCase()} permission)`);
      onCancel();
    } catch (error) {
      console.error("Error granting permissions:", error);
      message.error(error.response?.data?.error || "Failed to share resource. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const getUserName = (userId) => {
    const foundUser = users.find(u => u.id === userId);
    return foundUser ? foundUser.username : "Unknown User";
  };

  const getUserData = (userId) => {
    return users.find(u => u.id === userId);
  };

  const handleRemoveUser = (userId) => {
    setSelectedUsers(selectedUsers.filter(id => id !== userId));
  };

  const getPermissionTagColor = (type) => {
    return type === "READ" ? "blue" : "green";
  };

  const getRoleColor = (role) => {
    switch(role) {
      case "ADMIN": return "red";
      case "EDITOR": return "blue";
      default: return "green"; // VIEWER
    }
  };

  // Theme-aware styles
  const listItemStyle = {
    padding: "12px",
    backgroundColor: theme === 'dark' ? '#1f1f1f' : '#f5f5f5',
    borderRadius: "8px",
    marginBottom: "8px",
    transition: "all 0.3s ease"
  };

  return (
    <Modal
      title={
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <ShareAltOutlined style={{ fontSize: "18px" }} />
          <span>Share "{folderName}"</span>
        </div>
      }
      open={visible}
      onCancel={onCancel}
      width={500}
      footer={[
        <Button key="cancel" onClick={onCancel}>
          Cancel
        </Button>,
        <Button
          key="share"
          type="primary"
          loading={loading}
          disabled={selectedUsers.length === 0}
          onClick={handleShare}
        >
          Share
        </Button>
      ]}
      styles={{ 
        body: { 
          padding: "20px" 
        },
        header: {
          marginBottom: "8px"
        }
      }}
    >
      <Space direction="vertical" style={{ width: "100%" }} size="large">
        <div>
          <Text strong style={{ display: "block", marginBottom: "12px" }}>Select Users</Text>
          <Select
            mode="multiple"
            showSearch
            style={{ width: "100%" }}
            placeholder="Select users to share with"
            optionFilterProp="children"
            value={selectedUsers}
            onChange={setSelectedUsers}
            optionLabelProp="label"
            maxTagCount={3}
            showArrow
          >
            {users.map(user => (
              <Option key={user.id} value={user.id} label={user.username}>
                <div style={{ display: "flex", alignItems: "center", padding: "4px 0" }}>
                  <Avatar size="small" icon={<UserOutlined />} style={{ marginRight: "12px" }} />
                  <div style={{ flex: 1 }}>
                    <Text strong>{user.username}</Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: 12 }}>{user.email || 'No email'}</Text>
                  </div>
                  <Tag color={getRoleColor(user.role)}>{user.role}</Tag>
                </div>
              </Option>
            ))}
          </Select>
        </div>

        <div>
          <Text strong style={{ display: "block", marginBottom: "12px" }}>Permission Type</Text>
          <Select
            style={{ width: "100%" }}
            value={permissionType}
            onChange={setPermissionType}
            optionLabelProp="label"
          >
            <Option value="READ" label="Read only">
              <div style={{ display: "flex", alignItems: "center" }}>
                <div style={{ flex: 1 }}>
                  <Text strong>Read only</Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Users can only view content
                  </Text>
                </div>
                <Tag color="blue">READ</Tag>
              </div>
            </Option>
            <Option value="WRITE" label="Write">
              <div style={{ display: "flex", alignItems: "center" }}>
                <div style={{ flex: 1 }}>
                  <Text strong>Write</Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Users can view and modify content
                  </Text>
                </div>
                <Tag color="green">WRITE</Tag>
              </div>
            </Option>
          </Select>
        </div>

        {isFolder && (
          <div>
            <Text strong style={{ display: "block", marginBottom: "12px" }}>Apply to Subdirectories and Files</Text>
            <Select
              style={{ width: "100%" }}
              value={cascadeToChildren}
              onChange={setCascadeToChildren}
              optionLabelProp="label"
            >
              <Option value={true} label="Yes">
                <div style={{ display: "flex", alignItems: "center", padding: "4px 0" }}>
                  <div style={{ flex: 1 }}>
                    <Text strong>Yes</Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      Apply to all files and subdirectories
                    </Text>
                  </div>
                  <Tag color="blue">Cascade</Tag>
                </div>
              </Option>
              <Option value={false} label="No">
                <div style={{ display: "flex", alignItems: "center", padding: "4px 0" }}>
                  <div style={{ flex: 1 }}>
                    <Text strong>No</Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      Apply only to this directory
                    </Text>
                  </div>
                  <Tag color="orange">This directory only</Tag>
                </div>
              </Option>
            </Select>
          </div>
        )}

        {selectedUsers.length > 0 && (
          <>
            <Divider style={{ margin: "16px 0" }} />
            <div>
              <Text strong style={{ marginBottom: "12px", display: "block" }}>
                Will be shared with:
              </Text>
              <List
                itemLayout="horizontal"
                dataSource={selectedUsers.map(userId => getUserData(userId)).filter(Boolean)}
                renderItem={userData => (
                  <List.Item
                    style={listItemStyle}
                    actions={[
                      <Button 
                        type="text" 
                        icon={<DeleteOutlined />} 
                        onClick={() => handleRemoveUser(userData.id)}
                        danger
                        size="small"
                      />
                    ]}
                  >
                    <List.Item.Meta
                      avatar={<Avatar icon={<UserOutlined />} />}
                      title={
                        <Space align="center">
                          <Text strong>{userData.username}</Text>
                          <Tag color={getRoleColor(userData.role)}>{userData.role}</Tag>
                        </Space>
                      }
                      description={userData.email || 'No email'}
                    />
                    <Tag color={getPermissionTagColor(permissionType)}>
                      {permissionType === "READ" ? "Read only" : "Write"}
                    </Tag>
                  </List.Item>
                )}
              />
            </div>
          </>
        )}
      </Space>
    </Modal>
  );
};

export default ShareModal;
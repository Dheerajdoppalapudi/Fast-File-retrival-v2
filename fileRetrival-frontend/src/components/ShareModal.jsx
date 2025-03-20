import React, { useState, useEffect, useContext } from "react";
import { Modal, Select, Button, Avatar, Space, Typography, Divider, message, List, Tag } from "antd";
import { UserOutlined, DeleteOutlined } from "@ant-design/icons";
import { AuthContext } from "../context/AuthContext";
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
          userId,                  // Changed from targetUserId to userId
          permissionType,          // READ or WRITE
          resourceType,            // FILE or DIRECTORY
          resourceId,              // ID of the file or directory
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

  return (
    <Modal
      title={
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <ShareIcon />
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
      styles={{ body: { padding: "20px" } }} // Updated from bodyStyle to styles
    >
      <Space direction="vertical" style={{ width: "100%" }} size="large">
        <div>
          <Text strong style={{ display: "block", marginBottom: "8px" }}>Select Users</Text>
          <Select
            mode="multiple"
            showSearch
            style={{ width: "100%" }}
            placeholder="Select users to share with"
            optionFilterProp="children"
            value={selectedUsers}
            onChange={setSelectedUsers}
            optionLabelProp="label"
          >
            {users.map(user => (
              <Option key={user.id} value={user.id} label={user.username}>
                <Space>
                  <Avatar size="small" icon={<UserOutlined />} />
                  <div>
                    <Text>{user.username}</Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: 12 }}>{user.email || 'No email'}</Text>
                  </div>
                  <Tag color={getRoleColor(user.role)}>{user.role}</Tag>
                </Space>
              </Option>
            ))}
          </Select>
        </div>

        <div>
          <Text strong style={{ display: "block", marginBottom: "8px" }}>Permission Type</Text>
          <Select
            style={{ width: "100%" }}
            value={permissionType}
            onChange={setPermissionType}
          >
            <Option value="READ">
              <Space>
                <span>Read only</span>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  (Users can only view)
                </Text>
              </Space>
            </Option>
            <Option value="WRITE">
              <Space>
                <span>Write</span>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  (Users can view and modify)
                </Text>
              </Space>
            </Option>
          </Select>
        </div>

        {isFolder && (
          <div>
            <Text strong style={{ display: "block", marginBottom: "8px" }}>Apply to Subdirectories and Files</Text>
            <Select
              style={{ width: "100%" }}
              value={cascadeToChildren}
              onChange={setCascadeToChildren}
            >
              <Option value={true}>
                <Space>
                  <span>Yes</span>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    (Apply to all files and subdirectories)
                  </Text>
                </Space>
              </Option>
              <Option value={false}>
                <Space>
                  <span>No</span>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    (Apply only to this directory)
                  </Text>
                </Space>
              </Option>
            </Select>
          </div>
        )}

        {selectedUsers.length > 0 && (
          <>
            <Divider style={{ margin: "16px 0" }} />
            <div>
              <Text strong style={{ marginBottom: "8px", display: "block" }}>
                Will be shared with:
              </Text>
              <List
                itemLayout="horizontal"
                dataSource={selectedUsers.map(userId => getUserData(userId)).filter(Boolean)}
                renderItem={userData => (
                  <List.Item
                    style={{
                      padding: "12px",
                      backgroundColor: "#f5f5f5",
                      borderRadius: "8px",
                      marginBottom: "8px"
                    }}
                    actions={[
                      <Button 
                        type="text" 
                        icon={<DeleteOutlined />} 
                        onClick={() => handleRemoveUser(userData.id)}
                        danger
                      />
                    ]}
                  >
                    <List.Item.Meta
                      avatar={<Avatar icon={<UserOutlined />} />}
                      title={
                        <Space>
                          {userData.username}
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

// Simple icon component for the modal title
const ShareIcon = () => (
  <svg viewBox="64 64 896 896" focusable="false" data-icon="share-alt" width="1em" height="1em" fill="currentColor" aria-hidden="true">
    <path d="M752 664c-28.5 0-54.8 10-75.4 26.7L469.4 540.8a160.68 160.68 0 000-57.6l207.2-149.9C697.2 350 723.5 360 752 360c66.2 0 120-53.8 120-120s-53.8-120-120-120-120 53.8-120 120c0 11.6 1.6 22.7 4.7 33.3L439.9 415.8C410.7 377.1 364.3 352 312 352c-88.4 0-160 71.6-160 160s71.6 160 160 160c52.3 0 98.7-25.1 127.9-63.8l196.8 142.5c-3.1 10.6-4.7 21.8-4.7 33.3 0 66.2 53.8 120 120 120s120-53.8 120-120-53.8-120-120-120zm0-476c28.7 0 52 23.3 52 52s-23.3 52-52 52-52-23.3-52-52 23.3-52 52-52zM312 600c-48.5 0-88-39.5-88-88s39.5-88 88-88 88 39.5 88 88-39.5 88-88 88zm440 236c-28.7 0-52-23.3-52-52s23.3-52 52-52 52 23.3 52 52-23.3 52-52 52z"></path>
  </svg>
);

export default ShareModal;
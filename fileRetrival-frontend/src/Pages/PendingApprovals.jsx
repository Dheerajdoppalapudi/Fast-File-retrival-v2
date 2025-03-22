import React, { useState, useEffect, useContext, useCallback } from "react";
import axios from "axios";
import {
  Table, Button, Space, Typography, Tag, message, Card, Spin, Empty, Badge, Tooltip, Row, Col, Divider, Tabs, Modal, Dropdown
} from "antd";
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  SyncOutlined,
  FileOutlined,
  UserOutlined,
  ClockCircleOutlined,
  ReloadOutlined,
  HistoryOutlined,
  DiffOutlined,
  EyeOutlined,
  ExclamationCircleOutlined,
  FileTextOutlined,
  MoreOutlined
} from '@ant-design/icons';
import { AuthContext } from "../context/AuthContext";
import CompareModal from "../components/CompareModal";

const { Title, Text } = Typography;
const { TabPane } = Tabs;
const { confirm } = Modal;

const PendingApprovals = () => {
  const [approvals, setApprovals] = useState([]);
  const [approvedHistory, setApprovedHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("pending");
  const [compareModalVisible, setCompareModalVisible] = useState(false);
  const [compareData, setCompareData] = useState(null);
  const { user } = useContext(AuthContext);
  const [refreshKey, setRefreshKey] = useState(0);

  // Memoize fetch functions to prevent unnecessary re-renders
  const fetchApprovalList = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axios.get("http://localhost:8000/files/get-approval-list", {
        headers: { Authorization: `Bearer ${user?.token}` },
      });

      const formattedApprovals = response.data.approvals.map(approval => ({
        ...approval,
        key: approval.id, // Adding a key for better React performance
        hasVersions: approval.versions && approval.versions.length > 0,
      }));

      setApprovals(formattedApprovals);
    } catch (error) {
      console.error("Error fetching approval list:", error);
      message.error("Failed to fetch pending approvals: " + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  }, [user]);

  const fetchApprovedHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const response = await axios.get(`http://localhost:8000/files/approvedList`, {
        headers: { Authorization: `Bearer ${user?.token}` },
      });

      const formattedHistory = response.data.approvals.map(approval => ({
        ...approval,
        key: approval.id,
      }));

      setApprovedHistory(formattedHistory);
    } catch (error) {
      console.error("Error fetching approved history:", error);
      const errorMsg = error.response?.data?.message || "Failed to fetch approval history.";
      message.error(errorMsg);
    } finally {
      setHistoryLoading(false);
    }
  }, [user]);

  // Effect for initial data loading
  useEffect(() => {
    if (user?.role === "ADMIN") {
      fetchApprovalList();
    }
  }, [user, fetchApprovalList, refreshKey]);

  // Effect for tab-based loading
  useEffect(() => {
    if (user?.role === "ADMIN" && activeTab === "history") {
      fetchApprovedHistory();
    }
  }, [user, activeTab, fetchApprovedHistory, refreshKey]);

  // Handle approval action
  const handleApprove = async (fileId, fileName) => {
    confirm({
      title: `Approve file: ${fileName}?`,
      icon: <CheckCircleOutlined style={{ color: 'green' }} />,
      content: 'This action will mark the file as approved and make it available to users.',
      onOk: async () => {
        try {
          await axios.post(
            `http://localhost:8000/files/approve/`,
            {
              params: { fileId: fileId },
            },
            {
              headers: { Authorization: `Bearer ${user?.token}` },
            }
          );
          message.success(`"${fileName}" approved successfully`);
          setRefreshKey(prevKey => prevKey + 1); // Trigger a refresh
        } catch (error) {
          console.error("Approval failed:", error);
          message.error("Approval failed: " + (error.response?.data?.error || error.message));
        }
      },
    });
  };

  // Handle rejection action
  const handleReject = async (fileId, fileName) => {
    confirm({
      title: `Reject file: ${fileName}?`,
      icon: <ExclamationCircleOutlined style={{ color: 'red' }} />,
      content: 'This action will mark the file as rejected.',
      okText: 'Reject',
      okType: 'danger',
      onOk: async () => {
        try {
          await axios.post(
            `http://localhost:8000/files/approvals/reject/${fileId}`,
            {},
            {
              headers: { Authorization: `Bearer ${user?.token}` },
            }
          );
          message.warning(`"${fileName}" has been rejected`);
          setRefreshKey(prevKey => prevKey + 1); // Trigger a refresh
        } catch (error) {
          console.error("Rejection failed:", error);
          const errorMsg = error.response?.data?.message || "Rejection failed. Please try again.";
          message.error(errorMsg);
        }
      },
    });
  };

  // Handle compare action
  const handleCompare = (record) => {
    if (record.versions && record.versions.length > 0) {
      const latestVersion = record.versions[0]; 

      setCompareData({
        fileName: record.name,
        description: record.description, // Include description in compare data
        currentPath: record.path,
        latestVersionPath: latestVersion.path,
        versionNumber: latestVersion.versionNumber,
        allVersions: record.versions,
        fileId: record.id,
        approvalStatus: record.approvalStatus
      });

      setCompareModalVisible(true);
    } else {
      message.info("No versions available to compare");
    }
  };

  // Render status tag with tooltip
  const getStatusTag = (status) => {
    switch (status) {
      case "APPROVED":
        return (
          <Tooltip title="This file has been approved">
            <Tag icon={<CheckCircleOutlined />} color="success">
              Approved
            </Tag>
          </Tooltip>
        );
      case "REJECTED":
        return (
          <Tooltip title="This file has been rejected">
            <Tag icon={<CloseCircleOutlined />} color="error">
              Rejected
            </Tag>
          </Tooltip>
        );
      case "PENDING":
      default:
        return (
          <Tooltip title="This file is waiting for approval">
            <Tag icon={<SyncOutlined spin />} color="warning">
              Pending
            </Tag>
          </Tooltip>
        );
    }
  };

  // Format date with tooltip
  const formatDate = (dateString) => {
    if (!dateString) return "—";
    
    const date = new Date(dateString);
    return (
      <Tooltip title={date.toLocaleString()}>
        <Space>
          <ClockCircleOutlined />
          {date.toLocaleDateString()}
        </Space>
      </Tooltip>
    );
  };

  // Render description with tooltip and truncation
  const renderDescription = (description) => {
    if (!description) return "—";
    
    const truncatedDesc = description.length > 40 
      ? `${description.substring(0, 40)}...` 
      : description;
    
    return (
      <Tooltip title={description}>
        <Space>
          <FileTextOutlined />
          <Text>{truncatedDesc}</Text>
        </Space>
      </Tooltip>
    );
  };

  // Create a dropdown menu for actions to save space
  const getActionMenu = (record) => {
    const items = [
      {
        key: 'approve',
        label: 'Approve',
        icon: <CheckCircleOutlined style={{ color: 'green' }} />,
        disabled: record.approvalStatus !== "PENDING",
        onClick: () => handleApprove(record.id, record.name)
      },
      {
        key: 'reject',
        label: 'Reject',
        icon: <CloseCircleOutlined style={{ color: 'red' }} />,
        disabled: record.approvalStatus !== "PENDING",
        onClick: () => handleReject(record.id, record.name)
      },
    ];

    if (record.hasVersions) {
      items.push({
        key: 'compare',
        label: 'Compare Versions',
        icon: <DiffOutlined />,
        onClick: () => handleCompare(record)
      });
    }

    return items;
  };

  // Table columns for pending approvals
  const pendingColumns = [
    {
      title: "File",
      dataIndex: "name",
      key: "name",
      render: (name) => (
        <Space>
          <FileOutlined />
          <Text strong>{name}</Text>
        </Space>
      ),
      sorter: (a, b) => a.name.localeCompare(b.name),
      width: 200,
      ellipsis: true,
    },
    {
      title: "Description",
      dataIndex: "description",
      key: "description",
      render: (description) => renderDescription(description),
      ellipsis: true,
      width: 200,
    },
    {
      title: "Uploaded By",
      dataIndex: "uploadedBy",
      key: "uploadedBy",
      render: (user) => (
        <Space>
          <UserOutlined />
          {user}
        </Space>
      ),
      sorter: (a, b) => a.uploadedBy.localeCompare(b.uploadedBy),
      width: 150,
      ellipsis: true,
    },
    {
      title: "Upload Date",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (date) => formatDate(date),
      sorter: (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
      defaultSortOrder: 'descend',
      width: 150,
    },
    {
      title: "Status",
      dataIndex: "approvalStatus",
      key: "approvalStatus",
      render: (status) => getStatusTag(status),
      filters: [
        { text: 'Pending', value: 'PENDING' },
        { text: 'Approved', value: 'APPROVED' },
        { text: 'Rejected', value: 'REJECTED' },
      ],
      onFilter: (value, record) => record.approvalStatus === value,
      width: 120,
    },
    {
      title: "Versions",
      dataIndex: "versions",
      key: "versions",
      render: (versions) => versions?.length || 0,
      width: 80,
      align: "center",
    },
    {
      title: "Actions",
      key: "actions",
      align: "center",
      width: 120,
      fixed: 'right',
      render: (_, record) => {
        // For small screens or when space is an issue, use a dropdown menu
        return (
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            {record.approvalStatus === "PENDING" ? (
              <Space>
                <Button
                  type="primary"
                  size="small"
                  icon={<CheckCircleOutlined />}
                  onClick={() => handleApprove(record.id, record.name)}
                >
                  Approve
                </Button>
                <Dropdown menu={{ items: getActionMenu(record) }}>
                  <Button type="text" icon={<MoreOutlined />} size="small" />
                </Dropdown>
              </Space>
            ) : (
              <Dropdown menu={{ items: getActionMenu(record) }}>
                <Button size="small" type="default">Actions <MoreOutlined /></Button>
              </Dropdown>
            )}
          </div>
        );
      },
    },
  ];

  // Table columns for history
  const historyColumns = [
    {
      title: "File",
      dataIndex: "name",
      key: "name",
      render: (name) => (
        <Space>
          <FileOutlined />
          <Text strong>{name}</Text>
        </Space>
      ),
      sorter: (a, b) => a.name.localeCompare(b.name),
      width: 200,
      ellipsis: true,
    },
    {
      title: "Description",
      dataIndex: "description",
      key: "description",
      render: (description) => renderDescription(description),
      ellipsis: true,
      width: 200,
    },
    {
      title: "Uploaded By",
      dataIndex: "uploadedBy",
      key: "uploadedBy",
      render: (user) => (
        <Space>
          <UserOutlined />
          {typeof user === 'object' ? user.username : user}
        </Space>
      ),
      width: 150,
      ellipsis: true,
    },
    {
      title: "Upload Date",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (date) => formatDate(date),
      sorter: (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
      defaultSortOrder: 'descend',
      width: 150,
    },
    {
      title: "Status",
      dataIndex: "approvalStatus",
      key: "approvalStatus",
      render: (status) => getStatusTag(status),
      width: 120,
    },
    {
      title: "Approved By",
      dataIndex: "approverName",
      key: "approverName",
      render: (name, record) => {
        const approver = record.approvedBy?.username || record.approverName || "—";
        return (
          <Space>
            <UserOutlined />
            {approver}
          </Space>
        );
      },
      width: 150,
      ellipsis: true,
    },
    {
      title: "Approval Date",
      dataIndex: "approvedAt",
      key: "approvedAt",
      render: (date) => formatDate(date),
      width: 150,
    },
    {
      title: "Actions",
      key: "actions",
      align: "center",
      width: 120,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          {record.hasVersions && (
            <Button
              type="default"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => handleCompare(record)}
            >
              History
            </Button>
          )}
        </Space>
      ),
    },
  ];

  // Access control check
  if (!user || user.role !== "ADMIN") {
    return (
      <Card className="shadow-sm">
        <Empty
          description="You do not have permission to view this page."
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      </Card>
    );
  }

  // Tab change handler
  const handleTabChange = (key) => {
    setActiveTab(key);
  };

  // Handle approval from the compare modal
  const handleApproveFromModal = (fileId) => {
    const file = approvals.find(a => a.id === fileId);
    if (file) {
      handleApprove(fileId, file.name);
    }
    setCompareModalVisible(false);
  };

  return (
    <Card className="shadow-sm" bordered={false}>
      <Tabs activeKey={activeTab} onChange={handleTabChange}>
        <TabPane
          tab={
            <span>
              <SyncOutlined spin={loading} />
              Pending Approvals
              <Badge
                count={approvals.filter(a => a.approvalStatus === "PENDING").length}
                showZero
                style={{ marginLeft: 8 }}
              />
            </span>
          }
          key="pending"
        >
          <Row align="middle" justify="space-between" style={{ marginBottom: 16 }}>
            <Col>
              <Title level={4} style={{ margin: 0 }}>Pending File Approvals</Title>
            </Col>
            <Col>
              <Button
                onClick={() => setRefreshKey(prevKey => prevKey + 1)}
                icon={<ReloadOutlined />}
                size="small"
                type="default"
                loading={loading}
              >
                Refresh
              </Button>
            </Col>
          </Row>

          <Divider style={{ margin: '12px 0' }} />

          <Spin spinning={loading} tip="Loading approvals...">
            <Table
              columns={pendingColumns}
              dataSource={approvals}
              rowKey="id"
              pagination={{
                pageSize: 8,
                showSizeChanger: true,
                pageSizeOptions: ['8', '16', '32'],
                showTotal: (total) => `Total ${total} items`
              }}
              bordered={false}
              size="middle"
              scroll={{ x: 1100 }}
              locale={{
                emptyText: (
                  <Empty
                    description="No pending approvals"
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                  />
                )
              }}
            />
          </Spin>
        </TabPane>

        <TabPane
          tab={
            <span>
              <HistoryOutlined spin={historyLoading} />
              <span>Approval History</span>
            </span>
          }
          key="history"
        >
          <Row align="middle" justify="space-between" style={{ marginBottom: 16 }}>
            <Col>
              <Title level={4} style={{ margin: 0 }}>Approved Files History</Title>
            </Col>
            <Col>
              <Button
                onClick={() => setRefreshKey(prevKey => prevKey + 1)}
                icon={<ReloadOutlined />}
                size="small"
                type="default"
                loading={historyLoading}
              >
                Refresh
              </Button>
            </Col>
          </Row>

          <Divider style={{ margin: '12px 0' }} />

          <Spin spinning={historyLoading} tip="Loading history...">
            <Table
              columns={historyColumns}
              dataSource={approvedHistory}
              rowKey="id"
              pagination={{
                pageSize: 8,
                showSizeChanger: true,
                pageSizeOptions: ['8', '16', '32'],
                showTotal: (total) => `Total ${total} items`
              }}
              bordered={false}
              size="middle"
              scroll={{ x: 1200 }}
              locale={{
                emptyText: (
                  <Empty
                    description="No approval history found"
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                  />
                )
              }}
            />
          </Spin>
        </TabPane>
      </Tabs>

      <CompareModal
        visible={compareModalVisible}
        onClose={() => setCompareModalVisible(false)}
        compareData={compareData}
        user={user}
        onApprove={handleApproveFromModal}
      />
    </Card>
  );
};

export default PendingApprovals;
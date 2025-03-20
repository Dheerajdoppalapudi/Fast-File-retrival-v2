import React, { useState, useEffect, useContext } from "react";
import axios from "axios";
import {
  Table, Button, Space, Typography, Tag, message, Card, Spin, Empty, Badge, Tooltip, Row, Col, Divider, Tabs, Modal, List
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
  DiffOutlined
} from '@ant-design/icons';
import { AuthContext } from "../context/AuthContext";
import CompareModal from "../components/CompareModal";

const { Title, Text } = Typography;
const { TabPane } = Tabs;

const PendingApprovals = () => {
  const [approvals, setApprovals] = useState([]);
  const [approvedHistory, setApprovedHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("pending");
  const [compareModalVisible, setCompareModalVisible] = useState(false);
  const [compareData, setCompareData] = useState(null);
  const { user } = useContext(AuthContext);

  useEffect(() => {
    if (user?.role === "ADMIN") {
      fetchApprovalList();
    }
  }, [user]);

  useEffect(() => {
    if (user?.role === "ADMIN" && activeTab === "history") {
      fetchApprovedHistory();
    }
  }, [user, activeTab]);

  const fetchApprovalList = async () => {
    setLoading(true);
    try {
      const response = await axios.get("http://localhost:8000/files/get-approval-list", {
        headers: { Authorization: `Bearer ${user?.token}` },
      });

      setApprovals(response.data.approvals);
    } catch (error) {
      console.error("Error fetching approval list:", error);
      message.error("Failed to fetch pending approvals.");
    } finally {
      setLoading(false);
    }
  };

  const fetchApprovedHistory = async () => {
    setHistoryLoading(true);
    try {
      const response = await axios.get(`http://localhost:8000/files/approvedList`, {
        headers: { Authorization: `Bearer ${user?.token}` },
      });

      setApprovedHistory(response.data.approvals);
    } catch (error) {
      console.error("Error fetching approved history:", error);
      const errorMsg = error.response?.data?.message || "Failed to fetch approval history.";
      message.error(errorMsg);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleApprove = async (fileId) => {
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
      message.success("File approved successfully");
      fetchApprovalList();
    } catch (error) {
      console.error("Approval failed:", error);
      message.error("Approval failed. Please try again.");
    }
  };

  const handleReject = async (fileId) => {
    try {
      await axios.post(
        `${API_BASE_URL}/files/approvals/reject/${fileId}`,
        {},
        {
          headers: { Authorization: `Bearer ${user?.token}` },
        }
      );
      message.warning("File rejected");
      fetchApprovalList();
    } catch (error) {
      console.error("Rejection failed:", error);
      const errorMsg = error.response?.data?.message || "Rejection failed. Please try again.";
      message.error(errorMsg);
    }
  };

  const handleCompare = (record) => {
    if (record.versions && record.versions.length > 0) {
      const latestVersion = record.versions[0]; 

      setCompareData({
        fileName: record.name,
        currentPath: record.path,
        latestVersionPath: latestVersion.path,
        versionNumber: latestVersion.versionNumber,
        allVersions: record.versions
      });

      setCompareModalVisible(true);
    } else {
      message.info("No versions available to compare");
    }
  };

  const getStatusTag = (status) => {
    switch (status) {
      case "APPROVED":
        return (
          <Tag icon={<CheckCircleOutlined />} color="success">
            Approved
          </Tag>
        );
      case "REJECTED":
        return (
          <Tag icon={<CloseCircleOutlined />} color="error">
            Rejected
          </Tag>
        );
      case "PENDING":
      default:
        return (
          <Tag icon={<SyncOutlined spin />} color="warning">
            Pending
          </Tag>
        );
    }
  };

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
    },
    {
      title: "Upload Date",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (date) => (
        <Tooltip title={new Date(date).toLocaleString()}>
          <Space>
            <ClockCircleOutlined />
            {new Date(date).toLocaleDateString()}
          </Space>
        </Tooltip>
      ),
    },
    {
      title: "Status",
      dataIndex: "approvalStatus",
      key: "approvalStatus",
      render: (status) => getStatusTag(status),
    },
    {
      title: "Approved By",
      dataIndex: "approvedBy",
      key: "approvedBy",
      render: (approvedBy) => approvedBy || "—",
    },
    {
      title: "Approval Date",
      dataIndex: "approvedAt",
      key: "approvedAt",
      render: (date) => (date ? new Date(date).toLocaleDateString() : "—"),
    },
    {
      title: "Actions",
      key: "actions",
      align: "center",
      render: (_, record) => (
        <Space size="small">
          <Button
            type="primary"
            size="small"
            icon={<CheckCircleOutlined />}
            onClick={() => handleApprove(record.id)}
            disabled={record.approvalStatus !== "PENDING"}
          >
            Approve
          </Button>
          <Button
            danger
            size="small"
            icon={<CloseCircleOutlined />}
            onClick={() => handleReject(record.id)}
            disabled={record.approvalStatus !== "PENDING"}
          >
            Reject
          </Button>
          {record.hasVersions && (
            <Tag
             color="geekblue"
              type="default"
              size="small"
              icon={<DiffOutlined />}
              onClick={() => handleCompare(record)}
            >
              Compare
            </Tag>
          )}
        </Space>
      ),
    },
  ];

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
    },
    {
      title: "Uploaded By",
      dataIndex: "uploadedBy",
      key: "uploadedBy",
      render: (user) => (
        <Space>
          <UserOutlined />
          {user.username}
        </Space>
      ),
    },
    {
      title: "Upload Date",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (date) => (
        <Tooltip title={new Date(date).toLocaleString()}>
          <Space>
            <ClockCircleOutlined />
            {new Date(date).toLocaleDateString()}
          </Space>
        </Tooltip>
      ),
    },
    {
      title: "Status",
      dataIndex: "approvalStatus",
      key: "approvalStatus",
      render: (status) => getStatusTag(status),
    },
    {
      title: "Approved By",
      dataIndex: "approvedBy",
      key: "approvedBy",
      render: (approvedBy) => (
        <Space>
          <UserOutlined />
          {approvedBy.username}
        </Space>
      ),
    },
    {
      title: "Approval Date",
      dataIndex: "approvedAt",
      key: "approvedAt",
      render: (date) => (
        <Tooltip title={new Date(date).toLocaleString()}>
          <Space>
            <ClockCircleOutlined />
            {new Date(date).toLocaleDateString()}
          </Space>
        </Tooltip>
      ),
    },
    {
      title: "Latest Version",
      dataIndex: "latestVersion",
      key: "latestVersion",
      render: (version) => version ? `v${version.versionNumber}` : "—",
    },
  ];

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

  const handleTabChange = (key) => {
    setActiveTab(key);
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
                onClick={fetchApprovalList}
                icon={<ReloadOutlined />}
                size="small"
                type="default"
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
                showSizeChanger: false,
                showTotal: (total) => `Total ${total} items`
              }}
              bordered={false}
              size="middle"
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
                onClick={fetchApprovedHistory}
                icon={<ReloadOutlined />}
                size="small"
                type="default"
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
                showSizeChanger: false,
                showTotal: (total) => `Total ${total} items`
              }}
              bordered={false}
              size="middle"
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
    />
    </Card>
  );
};

export default PendingApprovals;
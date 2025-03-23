import React, { useState, useEffect, useContext, useCallback } from "react";
import axios from "axios";
import {
  Table, Button, Space, Typography, Tag, message, Card, Spin, Empty, Badge, Tooltip, Row, Col, Divider, Tabs, Modal, Descriptions
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
  InfoCircleOutlined
} from '@ant-design/icons';
import { AuthContext } from "../context/AuthContext";
import CompareModal from "../components/CompareModal";

const { Title, Text, Paragraph } = Typography;
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
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const { user } = useContext(AuthContext);
  const [refreshKey, setRefreshKey] = useState(0);

  // Check if user has approval permissions
  const canApprove = user?.role === "ADMIN"; // Only admins can approve
  const hasAccess = user?.role === "ADMIN" || user?.role === "EDITOR"; // Both admins and editors have access

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
    if (hasAccess) {
      fetchApprovalList();
    }
  }, [user, fetchApprovalList, refreshKey, hasAccess]);

  // Effect for tab-based loading
  useEffect(() => {
    if (hasAccess && activeTab === "history") {
      fetchApprovedHistory();
    }
  }, [user, activeTab, fetchApprovedHistory, refreshKey, hasAccess]);

  // Show details modal with file information
  const showDetailsModal = (record) => {
    setSelectedFile(record);
    setDetailsModalVisible(true);
  };

  // Handle approval action
  const handleApprove = async (fileId, fileName) => {
    if (!canApprove) {
      message.error("You don't have permission to approve files.");
      return;
    }

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
      setDetailsModalVisible(false);
    } catch (error) {
      console.error("Approval failed:", error);
      message.error("Approval failed: " + (error.response?.data?.error || error.message));
    }
  };

  // Handle rejection action
  const handleReject = async (fileId, fileName) => {
    if (!canApprove) {
      message.error("You don't have permission to reject files.");
      return;
    }

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
          setDetailsModalVisible(false);
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

  // Get the appropriate actions for a record based on user role
  const getActionButtons = (record) => {
    // For ADMIN: Show all action buttons
    if (canApprove) {
      return (
        <Space size="small">
          <Button
            type="primary"
            size="small"
            icon={<InfoCircleOutlined />}
            onClick={() => showDetailsModal(record)}
          >
            {record.approvalStatus === "PENDING" ? "Approve" : "Details"}
          </Button>
          {record.approvalStatus === "PENDING" && (
            <Button
              danger
              size="small"
              icon={<CloseCircleOutlined />}
              onClick={() => handleReject(record.id, record.name)}
            >
              Reject
            </Button>
          )}
          {record.hasVersions && (
            <Button
              type="default"
              size="small"
              icon={<DiffOutlined />}
              onClick={() => handleCompare(record)}
            >
              Compare
            </Button>
          )}
        </Space>
      );
    }

    // For EDITOR: Only show view details and compare
    return (
      <Space size="small">
        <Button
          type="default"
          size="small"
          icon={<InfoCircleOutlined />}
          onClick={() => showDetailsModal(record)}
        >
          Details
        </Button>
        {record.hasVersions && (
          <Button
            type="default"
            size="small"
            icon={<DiffOutlined />}
            onClick={() => handleCompare(record)}
          >
            Compare
          </Button>
        )}
      </Space>
    );
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
      width: 250,
      ellipsis: true,
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
      width: 180,
      ellipsis: true,
    },
    {
      title: "Upload Date",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (date) => formatDate(date),
      sorter: (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
      defaultSortOrder: 'descend',
      width: 180,
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
      width: 100,
      align: "center",
    },
    {
      title: "Actions",
      key: "actions",
      align: "center",
      width: 300,
      render: (_, record) => getActionButtons(record),
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
      width: 250,
      ellipsis: true,
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
      width: 180,
      ellipsis: true,
    },
    {
      title: "Upload Date",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (date) => formatDate(date),
      sorter: (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
      defaultSortOrder: 'descend',
      width: 180,
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
      width: 180,
      ellipsis: true,
    },
    {
      title: "Approval Date",
      dataIndex: "approvedAt",
      key: "approvedAt",
      render: (date) => formatDate(date),
      width: 180,
    },
    {
      title: "Actions",
      key: "actions",
      align: "center",
      width: 180,
      render: (_, record) => (
        <Space size="small">
          <Button
            type="default"
            size="small"
            icon={<InfoCircleOutlined />}
            onClick={() => showDetailsModal(record)}
          >
            Details
          </Button>
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
  if (!hasAccess) {
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
    if (!canApprove) {
      message.error("You don't have permission to approve files.");
      return;
    }

    const file = approvals.find(a => a.id === fileId);
    if (file) {
      handleApprove(fileId, file.name);
    }
    setCompareModalVisible(false);
  };

  // Get the appropriate footer for the details modal based on user role and file status
  const getModalFooter = () => {
    if (!selectedFile) return null;

    // For ADMIN and PENDING status: Show Approve/Reject buttons
    if (canApprove && selectedFile.approvalStatus === "PENDING") {
      return [
        <Button key="close" onClick={() => setDetailsModalVisible(false)}>
          Cancel
        </Button>,
        <Button
          key="reject"
          danger
          icon={<CloseCircleOutlined />}
          onClick={() => handleReject(selectedFile.id, selectedFile.name)}
        >
          Reject
        </Button>,
        <Button
          key="approve"
          type="primary"
          icon={<CheckCircleOutlined />}
          onClick={() => handleApprove(selectedFile.id, selectedFile.name)}
        >
          Approve
        </Button>,
      ];
    }

    // For all other cases: Just show Close button
    return [
      <Button key="close" onClick={() => setDetailsModalVisible(false)}>
        Close
      </Button>,
    ];
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
              <Title level={4} style={{ margin: 0 }}>
                Pending File Approvals
                {!canApprove && <Text type="secondary" style={{ fontSize: '14px', marginLeft: '10px' }}>(View only)</Text>}
              </Title>
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
              scroll={{ x: 1100 }}
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

      {/* File details modal */}
      <Modal
        title={
          <Space>
            <FileOutlined />
            <span>File Details: {selectedFile?.name}</span>
          </Space>
        }
        open={detailsModalVisible}
        onCancel={() => setDetailsModalVisible(false)}
        footer={getModalFooter()}
        width={700}
      >
        {selectedFile && (
          <div style={{ maxHeight: '65vh', overflowY: 'auto', paddingRight: '10px' }}>
            <Descriptions
              bordered
              column={{ xxl: 2, xl: 2, lg: 2, md: 1, sm: 1, xs: 1 }}
              style={{ marginBottom: '20px' }}
            >
              <Descriptions.Item label="File Name" span={2}>
                <Space>
                  <FileOutlined />
                  <Text strong>{selectedFile.name}</Text>
                </Space>
              </Descriptions.Item>

              <Descriptions.Item label="Description" span={2}>
                <Paragraph>{selectedFile.description || "—"}</Paragraph>
              </Descriptions.Item>

              <Descriptions.Item label="File Path">
                <Text copyable>{selectedFile.path}</Text>
              </Descriptions.Item>

              <Descriptions.Item label="Status">
                {getStatusTag(selectedFile.approvalStatus)}
              </Descriptions.Item>

              <Descriptions.Item label="Uploaded By">
                <Space>
                  <UserOutlined />
                  {typeof selectedFile.uploadedBy === 'object'
                    ? selectedFile.uploadedBy.username
                    : selectedFile.uploadedBy}
                </Space>
              </Descriptions.Item>

              <Descriptions.Item label="Upload Date">
                {formatDate(selectedFile.createdAt)}
              </Descriptions.Item>

              {selectedFile.approvalStatus === "APPROVED" && (
                <>
                  <Descriptions.Item label="Approved By">
                    <Space>
                      <UserOutlined />
                      {selectedFile.approvedBy?.username || selectedFile.approverName || "—"}
                    </Space>
                  </Descriptions.Item>
                  <Descriptions.Item label="Approval Date">
                    {formatDate(selectedFile.approvedAt)}
                  </Descriptions.Item>
                </>
              )}

              <Descriptions.Item label="Version Count">
                {selectedFile.versions?.length || 0}
              </Descriptions.Item>
            </Descriptions>

            {selectedFile.versions?.length > 0 && (
              <>
                <Divider orientation="left">Version History</Divider>
                <Table
                  size="small"
                  pagination={false}
                  dataSource={selectedFile.versions.map(v => ({ ...v, key: v.id }))}
                  columns={[
                    {
                      title: "Version",
                      dataIndex: "versionNumber",
                      key: "versionNumber",
                      width: 100,
                    },
                    {
                      title: "Description",
                      dataIndex: "description",
                      key: "description",
                      ellipsis: true,
                    },
                    {
                      title: "Created",
                      dataIndex: "createdAt",
                      key: "createdAt",
                      render: formatDate,
                      width: 180,
                    }
                  ]}
                />

                <div style={{ marginTop: '16px', textAlign: 'right' }}>
                  <Button
                    type="default"
                    icon={<DiffOutlined />}
                    onClick={() => {
                      handleCompare(selectedFile);
                      setDetailsModalVisible(false);
                    }}
                  >
                    Compare Versions
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </Modal>

      {/* Compare modal */}
      <CompareModal
        visible={compareModalVisible}
        onClose={() => setCompareModalVisible(false)}
        compareData={compareData}
        user={user}
        onApprove={canApprove ? handleApproveFromModal : null}
      />
    </Card>
  );
};

export default PendingApprovals;
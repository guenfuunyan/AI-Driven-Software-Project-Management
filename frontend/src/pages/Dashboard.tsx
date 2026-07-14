import React, { useEffect } from 'react';
import { Card, Row, Col, Statistic, Table, Tag } from 'antd';
import { CheckCircleOutlined, SyncOutlined, ClockCircleOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { motion } from 'framer-motion';
import { useProjectStore } from '../store/projectStore';

const columns = [
  {
    title: 'Project Name',
    dataIndex: 'name',
    key: 'name',
  },
  {
    title: 'Status',
    key: 'status',
    dataIndex: 'status',
    render: (status: string) => {
      let color = 'green';
      if (status === 'IN_PROGRESS') color = 'blue';
      if (status === 'PLANNING') color = 'orange';
      if (status === 'BLOCKED') color = 'red';
      return (
        <Tag color={color} key={status}>
          {status?.toUpperCase() || 'UNKNOWN'}
        </Tag>
      );
    },
  },
  {
    title: 'Description',
    dataIndex: 'description',
    key: 'description',
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

export const Dashboard: React.FC = () => {
  const { projects, isLoading, fetchProjects } = useProjectStore();

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 m-0">Dashboard</h1>
          <p className="text-gray-500 m-0">Welcome back, Admin User!</p>
        </div>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={6}>
          <motion.div variants={itemVariants}>
            <Card bordered={false} className="shadow-sm hover:shadow-md transition-shadow">
              <Statistic
                title="Active Projects"
                value={projects.length}
                prefix={<SyncOutlined spin className="text-blue-500" />}
              />
            </Card>
          </motion.div>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <motion.div variants={itemVariants}>
            <Card bordered={false} className="shadow-sm hover:shadow-md transition-shadow">
              <Statistic
                title="Completed Tasks"
                value={845}
                prefix={<CheckCircleOutlined className="text-green-500" />}
              />
            </Card>
          </motion.div>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <motion.div variants={itemVariants}>
            <Card bordered={false} className="shadow-sm hover:shadow-md transition-shadow">
              <Statistic
                title="Hours Tracked"
                value={142}
                prefix={<ClockCircleOutlined className="text-purple-500" />}
              />
            </Card>
          </motion.div>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <motion.div variants={itemVariants}>
            <Card bordered={false} className="shadow-sm hover:shadow-md transition-shadow">
              <Statistic
                title="At Risk"
                value={2}
                valueStyle={{ color: '#cf1322' }}
                prefix={<ExclamationCircleOutlined className="text-red-500" />}
              />
            </Card>
          </motion.div>
        </Col>
      </Row>

      <motion.div variants={itemVariants}>
        <Card title="Recent Projects" bordered={false} className="shadow-sm mt-4">
          <Table 
            columns={columns} 
            dataSource={projects} 
            loading={isLoading}
            pagination={false} 
            rowKey="id"
          />
        </Card>
      </motion.div>
    </motion.div>
  );
};

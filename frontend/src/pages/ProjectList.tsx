import React, { useState, useEffect } from 'react';
import { Card, Button, Input, Table, Tag, Modal, Form, message } from 'antd';
import { PlusOutlined, SearchOutlined } from '@ant-design/icons';
import { motion } from 'framer-motion';
import { useProjectStore } from '../store/projectStore';

const { Search } = Input;

export const ProjectList: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form] = Form.useForm();
  
  const { projects, isLoading, fetchProjects, createProject } = useProjectStore();

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
    },
    {
      title: 'Status',
      key: 'status',
      dataIndex: 'status',
      render: (status: string) => {
        let color = 'green';
        if (status === 'IN_PROGRESS') color = 'blue';
        if (status === 'PLANNING') color = 'orange';
        return <Tag color={color}>{status?.toUpperCase() || 'UNKNOWN'}</Tag>;
      },
    },
    {
      title: 'Action',
      key: 'action',
      render: () => (
        <Button type="link" className="text-blue-600 px-0">View Details</Button>
      ),
    },
  ];

  const handleCreate = async () => {
    try {
      const values = await form.validateFields();
      await createProject({ ...values, status: 'PLANNING' });
      message.success('Project created successfully!');
      setIsModalOpen(false);
      form.resetFields();
    } catch (error) {
      console.error(error);
      message.error('Failed to create project');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 m-0">Projects</h1>
          <p className="text-gray-500 m-0">Manage all your workspaces and projects.</p>
        </div>
        <Button 
          type="primary" 
          icon={<PlusOutlined />} 
          className="bg-blue-600"
          onClick={() => setIsModalOpen(true)}
        >
          New Project
        </Button>
      </div>

      <Card bordered={false} className="shadow-sm">
        <div className="mb-4 w-1/3 min-w-[250px]">
          <Search placeholder="Search projects..." prefix={<SearchOutlined />} />
        </div>
        <Table 
          columns={columns} 
          dataSource={projects} 
          loading={isLoading}
          rowKey="id" 
        />
      </Card>

      <Modal
        title="Create New Project"
        open={isModalOpen}
        onOk={handleCreate}
        onCancel={() => setIsModalOpen(false)}
        okText="Create"
        okButtonProps={{ className: 'bg-blue-600', loading: isLoading }}
      >
        <Form form={form} layout="vertical" className="mt-4">
          <Form.Item name="name" label="Project Name" rules={[{ required: true }]}>
            <Input placeholder="Enter project name" />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input.TextArea placeholder="Enter project description" rows={4} />
          </Form.Item>
        </Form>
      </Modal>
    </motion.div>
  );
};

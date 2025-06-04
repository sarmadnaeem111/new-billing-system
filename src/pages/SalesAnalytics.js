import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Container, Card, Button, Row, Col, Form, Table, Spinner, Alert } from 'react-bootstrap';
import { useAuth } from '../contexts/AuthContext';
import MainNavbar from '../components/Navbar';
import { formatCurrency } from '../utils/receiptUtils';
import { getDailySalesAndProfit, getMonthlySalesAndProfit, getYearlySalesAndProfit } from '../utils/salesUtils';
import './SalesAnalytics.css';
import { Translate } from '../utils';

const SalesAnalytics = () => {
  const { currentUser } = useAuth();
  const [viewMode, setViewMode] = useState('daily');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [loadingSection, setLoadingSection] = useState(''); // Track which section is loading

  // Memoize the date selector to prevent unnecessary re-renders
  const dateSelector = useMemo(() => {
    switch (viewMode) {
      case 'daily':
        return (
          <Form.Control
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
        );
      case 'monthly':
        return (
          <Form.Control
            type="month"
            value={selectedDate.substring(0, 7)}
            onChange={(e) => setSelectedDate(`${e.target.value}-01`)}
          />
        );
      case 'yearly':
        return (
          <Form.Control
            type="number"
            min="2000"
            max="2100"
            value={selectedDate.substring(0, 4)}
            onChange={(e) => setSelectedDate(`${e.target.value}-01-01`)}
          />
        );
      default:
        return null;
    }
  }, [viewMode, selectedDate]);

  // Memoize the fetch analytics function
  const fetchAnalyticsData = useCallback(async () => {
    if (!currentUser) return;

    setLoading(true);
    setError('');
    setLoadingSection('summary');
    
    try {
      let date;
      try {
        date = new Date(selectedDate);
        if (isNaN(date.getTime())) {
          date = new Date();
        }
      } catch (e) {
        date = new Date();
      }
      
      let data;
      
      switch (viewMode) {
        case 'daily':
          data = await getDailySalesAndProfit(currentUser.uid, date);
          break;
        case 'monthly':
          data = await getMonthlySalesAndProfit(currentUser.uid, date);
          break;
        case 'yearly':
          data = await getYearlySalesAndProfit(currentUser.uid, date);
          break;
        default:
          data = await getDailySalesAndProfit(currentUser.uid, date);
      }
      
      setAnalytics(data);
    } catch (error) {
      console.log('Analytics data fetch issue:', error.message || 'Error fetching data');
      setError('Failed to load analytics data. Please try again later.');
    } finally {
      setLoading(false);
      setLoadingSection('');
    }
  }, [currentUser, viewMode, selectedDate]);

  useEffect(() => {
    fetchAnalyticsData();
  }, [fetchAnalyticsData]);

  // Memoize the summary calculations
  const summary = useMemo(() => {
    if (!analytics) return null;

    const profitMargin = analytics.sales > 0 
      ? ((analytics.profit / analytics.sales) * 100).toFixed(2) 
      : 0;

    return {
      profitMargin,
      sales: analytics.sales,
      profit: analytics.profit,
      totalItems: analytics.totalItems,
      transactionCount: analytics.transactionCount
    };
  }, [analytics]);

  // Render loading state
  const renderLoading = () => (
    <div className="text-center my-4">
      <Spinner animation="border" role="status">
        <span className="visually-hidden">Loading...</span>
      </Spinner>
    </div>
  );

  // Render error state
  const renderError = () => (
    <Alert variant="danger" className="my-4">
      {error}
    </Alert>
  );

  // Render summary section
  const renderSummary = () => {
    if (!summary) return null;

    return (
      <>
        <Row className="mb-4">
          <Col md={3}>
            <Card className="text-center p-3 mb-3 shadow-sm analytics-card">
              <Card.Title><Translate textKey="totalSales" fallback="Total Sales" /></Card.Title>
              <Card.Text className="display-6">{formatCurrency(summary.sales)}</Card.Text>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="text-center p-3 mb-3 shadow-sm analytics-card">
              <Card.Title><Translate textKey="totalProfit" fallback="Total Profit" /></Card.Title>
              <Card.Text className="display-6">{formatCurrency(summary.profit)}</Card.Text>
              <small className="text-muted">{summary.profitMargin}% margin</small>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="text-center p-3 mb-3 shadow-sm analytics-card">
              <Card.Title><Translate textKey="itemsSold" fallback="Items Sold" /></Card.Title>
              <Card.Text className="display-6">{summary.totalItems}</Card.Text>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="text-center p-3 mb-3 shadow-sm analytics-card">
              <Card.Title><Translate textKey="transactions" fallback="Transactions" /></Card.Title>
              <Card.Text className="display-6">{summary.transactionCount}</Card.Text>
            </Card>
          </Col>
        </Row>
        
        {/* Profit Breakdown Section */}
        <Row className="mb-4">
          <Col md={12}>
            <Card className="shadow-sm profit-breakdown-card">
              <Card.Body>
                <h5><Translate textKey="profitBreakdown" fallback="Profit Breakdown" /></h5>
                <Row className="mt-3">
                  <Col xs={12} md={4} className="mb-2">
                    <div className="d-flex justify-content-between">
                      <span><Translate textKey="sales" fallback="Sales" />:</span>
                      <strong>{formatCurrency(summary.sales)}</strong>
                    </div>
                  </Col>
                  <Col xs={12} md={4} className="mb-2">
                    <div className="d-flex justify-content-between">
                      <span><Translate textKey="profit" fallback="Profit" />:</span>
                      <strong>{formatCurrency(summary.profit)}</strong>
                    </div>
                  </Col>
                  <Col xs={12} md={4} className="mb-2">
                    <div className="d-flex justify-content-between">
                      <span><Translate textKey="profitMargin" fallback="Profit Margin" />:</span>
                      <strong>{summary.profitMargin}%</strong>
                    </div>
                  </Col>
                </Row>
                <div className="progress mt-2" style={{ height: '25px' }}>
                  <div 
                    className="progress-bar bg-success" 
                    role="progressbar" 
                    style={{ width: `${summary.profitMargin}%` }} 
                    aria-valuenow={summary.profitMargin} 
                    aria-valuemin="0" 
                    aria-valuemax="100"
                  >
                    {summary.profitMargin}%
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </>
    );
  };

  // Render category breakdown section
  const renderCategoryBreakdown = () => {
    if (!analytics?.categoryData?.length) return null;

    return (
      <Card className="shadow-sm mb-4">
        <Card.Body>
          <h5><Translate textKey="categoryBreakdown" fallback="Category Breakdown" /></h5>
          <div className="table-responsive mt-3">
            <Table striped bordered hover>
              <thead>
                <tr>
                  <th><Translate textKey="category" fallback="Category" /></th>
                  <th><Translate textKey="sales" fallback="Sales" /></th>
                  <th><Translate textKey="profit" fallback="Profit" /></th>
                  <th><Translate textKey="profitMargin" fallback="Profit Margin" /></th>
                  <th><Translate textKey="itemsSold" fallback="Items Sold" /></th>
                </tr>
              </thead>
              <tbody>
                {analytics.categoryData.map((category, index) => (
                  <tr key={index}>
                    <td>{category.category}</td>
                    <td>{formatCurrency(category.sales)}</td>
                    <td>{formatCurrency(category.profit)}</td>
                    <td>{category.profitMargin}%</td>
                    <td>{category.items}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
          
          <h6 className="mt-4"><Translate textKey="salesDistribution" fallback="Sales Distribution" /></h6>
          {analytics.categoryData.map((category, index) => {
            const percentage = analytics.sales > 0 
              ? (category.sales / analytics.sales * 100).toFixed(1) 
              : 0;
            
            return (
              <div key={index} className="mb-2">
                <div className="d-flex justify-content-between mb-1">
                  <span>{category.category}</span>
                  <span>{formatCurrency(category.sales)} ({percentage}%)</span>
                </div>
                <div className="progress" style={{ height: '20px' }}>
                  <div 
                    className="progress-bar" 
                    role="progressbar" 
                    style={{ 
                      width: `${percentage}%`,
                      backgroundColor: `hsl(${210 - index * 30}, 70%, 50%)`
                    }} 
                    aria-valuenow={percentage} 
                    aria-valuemin="0" 
                    aria-valuemax="100"
                  >
                    {percentage > 5 ? `${percentage}%` : ''}
                  </div>
                </div>
              </div>
            );
          })}
        </Card.Body>
      </Card>
    );
  };

  return (
    <Container fluid>
      <MainNavbar />
      
      <div className="p-4">
        <h2 className="mb-4"><Translate textKey="salesAndProfitAnalytics" fallback="Sales and Profit Analytics" /></h2>
        
        <Row className="mb-4 align-items-end">
          <Col md={6}>
            <Form.Group>
              <Form.Label><Translate textKey="viewMode" fallback="View Mode" /></Form.Label>
              <div>
                <Button
                  variant={viewMode === 'daily' ? 'primary' : 'outline-primary'}
                  className="me-2"
                  onClick={() => setViewMode('daily')}
                >
                  <Translate textKey="daily" fallback="Daily" />
                </Button>
                <Button
                  variant={viewMode === 'monthly' ? 'primary' : 'outline-primary'}
                  className="me-2"
                  onClick={() => setViewMode('monthly')}
                >
                  <Translate textKey="monthly" fallback="Monthly" />
                </Button>
                <Button
                  variant={viewMode === 'yearly' ? 'primary' : 'outline-primary'}
                  onClick={() => setViewMode('yearly')}
                >
                  <Translate textKey="yearly" fallback="Yearly" />
                </Button>
              </div>
            </Form.Group>
          </Col>
          <Col md={6}>
            <Form.Group>
              <Form.Label><Translate textKey="selectYear" fallback="Select Year" /></Form.Label>
              {dateSelector}
            </Form.Group>
          </Col>
        </Row>

        {error && renderError()}
        
        {loading ? (
          renderLoading()
        ) : (
          <>
            {loadingSection === 'summary' ? renderLoading() : renderSummary()}
            {loadingSection === 'categories' ? renderLoading() : renderCategoryBreakdown()}
          </>
        )}
      </div>
    </Container>
  );
};

export default SalesAnalytics; 

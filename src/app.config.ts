export default defineAppConfig({
  pages: [
    'pages/transaction/index',
    'pages/query/index',
    'pages/exception/index',
    'pages/inbound/index',
    'pages/outbound/index',
    'pages/return/index',
    'pages/stocktake/index',
    'pages/part-detail/index'
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#1E40AF',
    navigationBarTitleText: '航材寿命管理',
    navigationBarTextStyle: 'white',
    backgroundColor: '#F8FAFC'
  },
  tabBar: {
    color: '#94A3B8',
    selectedColor: '#1E40AF',
    backgroundColor: '#FFFFFF',
    borderStyle: 'white',
    list: [
      {
        pagePath: 'pages/transaction/index',
        text: '收发'
      },
      {
        pagePath: 'pages/query/index',
        text: '查询'
      },
      {
        pagePath: 'pages/exception/index',
        text: '异常'
      }
    ]
  }
})

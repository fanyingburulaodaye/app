// 获取app实例以获取正确的基础URL
const getApp = () => {
  return typeof wx.getApp === 'function' ? wx.getApp() : null;
};

const getBaseUrl = () => {
  const app = getApp();
  return app ? app.globalData.baseUrl : 'http://ceshi1119.w1.luyouxia.net';
};

// 添加一个简单的随机数生成器，用于防止缓存
const getRandomString = () => {
  return Math.random().toString(36).substring(2, 15);
};

const request = (url, method, data, retryCount = 0, noAuth = false) => {
  // 获取token
  const token = wx.getStorageSync('token');
  
  // 检查token是否存在，如果noAuth为true，则不检查
  if (!token && !noAuth) {
    console.log('未登录，跳转到登录页面');
    // 跳转到登录页面
    setTimeout(() => {
      wx.redirectTo({
        url: '/pages/login/login',
      });
    }, 1000);
    return Promise.reject('未登录');
  }
  
  // 构建请求URL，添加随机参数防止缓存
  let requestUrl = `${getBaseUrl()}${url}`;
  const separator = requestUrl.includes('?') ? '&' : '?';
  requestUrl = `${requestUrl}${separator}_=${getRandomString()}`;
  
  // 设置请求头
  const header = {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache, no-store, must-revalidate'
  };
  
  // 如果有token且不是无需认证的请求，添加Authorization头
  // 注意: 添加Bearer前缀，符合JWT标准
  if (token && !noAuth) {
    // 检查token是否已经有Bearer前缀
    if (token.startsWith('Bearer ')) {
      header.Authorization = token;
    } else {
      header.Authorization = `Bearer ${token}`;
    }
  }
  
  return new Promise((resolve, reject) => {
    wx.request({
      url: requestUrl,
      method: method,
      data: data,
      header: header,
      success: (res) => {
        if (res.statusCode === 200) {
          resolve(res.data);
        } else if (res.statusCode === 401 || res.statusCode === 403) {
          // token过期或无效
          console.log('Token失效，需要重新登录', res);
          
          // 如果是无需认证的请求，直接返回错误
          if (noAuth) {
            reject(res.data);
            return;
          }
          
          // 清除无效token和相关数据
          wx.removeStorageSync('token');
          
          // 跳转到登录页面
          wx.redirectTo({
            url: '/pages/login/login',
          });
          reject(res.data);
        } else {
          console.error('请求失败', res);
          reject(res.data);
        }
      },
      fail: (err) => {
        console.error('网络请求失败', err);
        
        // 网络错误，尝试重试(最多重试3次)
        if (retryCount < 3) {
          console.log(`请求失败，正在进行第${retryCount + 1}次重试...`);
          
          // 延迟一段时间后重试
          setTimeout(() => {
            request(url, method, data, retryCount + 1, noAuth)
              .then(resolve)
              .catch(reject);
          }, 1000 * (retryCount + 1)); // 逐渐增加重试间隔
        } else {
          wx.showToast({
            title: '网络请求失败，请检查网络连接',
            icon: 'none'
          });
          reject(err);
        }
      }
    });
  });
};

// 封装微信API的请求
const wxRequest = (url, method, data, options = {}) => {
  const { noAuth = false } = options;
  return request(url, method, data, 0, noAuth);
};

module.exports = {
  get: (url, data, options) => wxRequest(url, 'GET', data, options),
  post: (url, data, options) => wxRequest(url, 'POST', data, options)
};
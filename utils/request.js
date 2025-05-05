const base_url = 'http://127.0.0.1:5001'

const request = (url, method, data) => {
  const token = wx.getStorageSync('token'); // 从本地存储中获取 token
  if (!token) {
    wx.showToast({
      title: '未登录',
      icon: 'none'
    });
    return;
  }
  return new Promise((resolve, reject) => {
    wx.request({
      url: base_url+url,
      method: method,
      data: data,
      header: {
        'Content-Type': 'application/json',
        'Authorization': token ? `${token}` : ''
      },
      success: (res) => {
        if (res.statusCode === 200) {
          resolve(res.data);
        } else {
          reject(res.data);
        }
      },
      fail: (err) => {
        reject(err);
      }
    });
  });
};

module.exports = {
  get: (url, data, token) => request(url, 'GET', data, token),
  post: (url, data, token) => request(url, 'POST', data, token)
};
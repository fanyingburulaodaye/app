Component({
  properties: {
    visible: {
      type: Boolean,
      value: false
    },
    title: {
      type: String,
      value: '联系助教大黄'
    }
  },
  data: {},
  methods: {
    onClose() {
      this.setData({
        visible: false
      });
      this.triggerEvent('close');
    }
  }
}) 
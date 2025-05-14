Component({
  properties: {
    courseData: {
      type: Array,
      value: []
    },
    stagesData: {
      type: Array,
      value: []
    },
    selectedDate: {
      type: String,
      value: ''
    }
  },

  data: {
    currentYear: new Date().getFullYear(),
    currentMonth: new Date().getMonth() + 1,
    currentDate: new Date().getDate(),
    days: [],
    weekdays: ['日', '一', '二', '三', '四', '五', '六']
  },

  lifetimes: {
    attached() {
      console.log('日历组件attached');
      this.generateCalendar();
    },
    ready() {
      console.log('日历组件ready');
      console.log('当前课程数据:', this.properties.courseData);
    }
  },

  observers: {
    'courseData': function(courseData) {
      console.log('课程数据更新:', courseData ? courseData.length : 0);
      if (courseData && courseData.length > 0) {
        // 检查是否有课程完成状态变化
        const coursesWithDates = courseData.filter(course => course.date);
        if (coursesWithDates.length > 0) {
          console.log('课程数据包含日期，更新日历');
        this.generateCalendar();
        }
      }
    },
    'selectedDate': function(selectedDate) {
      console.log('选中日期更新:', selectedDate);
      if (selectedDate) {
        this.generateCalendar();
      }
    },
    'stagesData': function(stagesData) {
      console.log('学习阶段数据更新:', stagesData ? stagesData.length : 0);
      if (stagesData && stagesData.length > 0) {
        this.generateCalendar();
      }
    }
  },

  methods: {
    // 生成日历数据
    generateCalendar() {
      try {
        console.log('生成日历数据');
        // 清空旧的日历数据
        const days = [];
        const year = this.data.currentYear;
        const month = this.data.currentMonth;
        
        // 获取当月第一天是星期几
        const firstDay = new Date(year, month - 1, 1).getDay();
        
        // 获取当月天数
        const daysInMonth = new Date(year, month, 0).getDate();
        
        // 前一个月的天数
        const daysInPrevMonth = new Date(year, month - 1, 0).getDate();
        
        // 填充上个月的日期
        for (let i = 0; i < firstDay; i++) {
          days.push({
            day: daysInPrevMonth - firstDay + i + 1,
            month: month - 1 === 0 ? 12 : month - 1,
            year: month - 1 === 0 ? year - 1 : year,
            isCurrentMonth: false,
            isToday: false,
            isSelected: false,
            coursesCount: 0,
            hasCompleted: false,
            allCompleted: false,
            stageIndex: this.getStageForDate(month - 1 === 0 ? year - 1 : year, month - 1 === 0 ? 12 : month - 1, daysInPrevMonth - firstDay + i + 1)
          });
        }
        
        // 填充当月的日期
        for (let i = 1; i <= daysInMonth; i++) {
          const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
          
          // 统计当天课程
          const todayCourses = this.properties.courseData.filter(course => 
            course.date === dateStr
          );
          
          console.log(`${dateStr} 的课程:`, todayCourses.length);
          
          // 检查课程状态
          const completedCourses = todayCourses.filter(course => course.is_completed);
          
          console.log(`${dateStr} 的已完成课程:`, completedCourses.length);
          
          // 检查是否为选中日期
          const isSelected = this.properties.selectedDate === dateStr;
          
          // 获取该日期对应的学习阶段
          const stageIndex = this.getStageForDate(year, month, i);
          
          days.push({
            day: i,
            month: month,
            year: year,
            isCurrentMonth: true,
            isToday: i === this.data.currentDate && month === new Date().getMonth() + 1 && year === new Date().getFullYear(),
            isSelected: isSelected,
            coursesCount: todayCourses.length,
            hasCompleted: completedCourses.length > 0,
            allCompleted: todayCourses.length > 0 && completedCourses.length === todayCourses.length,
            stageIndex: stageIndex
          });
        }
        
        // 需要填充的下个月的天数 (保证日历显示6行)
        const remainingDays = 42 - days.length;
        
        // 填充下个月的日期
        for (let i = 1; i <= remainingDays; i++) {
          days.push({
            day: i,
            month: month + 1 === 13 ? 1 : month + 1,
            year: month + 1 === 13 ? year + 1 : year,
            isCurrentMonth: false,
            isToday: false,
            isSelected: false,
            coursesCount: 0,
            hasCompleted: false,
            allCompleted: false,
            stageIndex: this.getStageForDate(month + 1 === 13 ? year + 1 : year, month + 1 === 13 ? 1 : month + 1, i)
          });
        }
        
        this.setData({ days });
      } catch (error) {
        console.error('生成日历出错:', error);
      }
    },
    
    // 获取指定日期所属的学习阶段
    getStageForDate(year, month, day) {
      // 如果没有阶段数据，返回-1表示无阶段
      if (!this.properties.stagesData || this.properties.stagesData.length === 0) {
        return -1;
      }

      // 格式化日期为yyyy-MM-dd
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const date = new Date(dateStr);
      
      // 遍历所有学习阶段，查找日期所属阶段
      for (let i = 0; i < this.properties.stagesData.length; i++) {
        const stage = this.properties.stagesData[i];
        
        // 检查time字段是否包含日期范围，支持多种格式
        // 1. yyyy-MM-dd~yyyy-MM-dd 格式
        const dateRangeMatch = stage.time.match(/(\d{4}-\d{2}-\d{2})~(\d{4}-\d{2}-\d{2})/);
        if (dateRangeMatch) {
          const startDate = new Date(dateRangeMatch[1]);
          const endDate = new Date(dateRangeMatch[2]);
          
          if (date >= startDate && date <= endDate) {
            return i;
          }
          continue;
        }
        
        // 2. 第n-m周格式
        const weekMatch = stage.time.match(/第(\d+)-(\d+)周/);
        if (weekMatch) {
          // 这里需要一个判断当前日期是第几周的逻辑
          // 由于这里不容易实现，暂不处理这种情况
          continue;
        }
        
        // 3. n月-m月格式
        const monthMatch = stage.time.match(/(\d+)月-(\d+)月/);
        if (monthMatch) {
          const startMonth = parseInt(monthMatch[1]);
          const endMonth = parseInt(monthMatch[2]);
          
          if (month >= startMonth && month <= endMonth) {
            return i;
          }
          continue;
        }
      }
      
      return -1; // 没找到匹配的阶段
    },
    
    // 上一个月
    prevMonth() {
      console.log('切换到上个月');
      let { currentYear, currentMonth } = this.data;
      
      currentMonth--;
      if (currentMonth < 1) {
        currentMonth = 12;
        currentYear--;
      }
      
      this.setData({
        currentYear,
        currentMonth
      });
      
      this.generateCalendar();
      this.triggerEvent('monthChange', { year: currentYear, month: currentMonth });
    },
    
    // 下一个月
    nextMonth() {
      console.log('切换到下个月');
      let { currentYear, currentMonth } = this.data;
      
      currentMonth++;
      if (currentMonth > 12) {
        currentMonth = 1;
        currentYear++;
      }
      
      this.setData({
        currentYear,
        currentMonth
      });
      
      this.generateCalendar();
      this.triggerEvent('monthChange', { year: currentYear, month: currentMonth });
    },
    
    // 选择日期
    selectDate(e) {
      console.log('选择日期:', e.currentTarget.dataset);
      const { day, month, year, isCurrentMonth } = e.currentTarget.dataset;
      
      // 如果选择的是当前月的日期
      if (isCurrentMonth) {
        const formattedDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        this.triggerEvent('dateSelect', { date: formattedDate });
      }
    },
    
    // 获取学习阶段的颜色
    getStageColor: function(stageIndex) {
      // 预定义的阶段颜色数组
      const stageColors = [
        'rgba(116, 185, 255, 0.2)',  // 浅蓝色
        'rgba(120, 224, 143, 0.2)',  // 浅绿色
        'rgba(255, 196, 140, 0.2)',  // 浅橙色
        'rgba(162, 155, 254, 0.2)',  // 浅紫色
        'rgba(255, 163, 177, 0.2)',  // 浅红色
        'rgba(108, 218, 231, 0.2)',  // 浅青色
        'rgba(253, 237, 176, 0.2)',  // 浅黄色
        'rgba(241, 196, 255, 0.2)'   // 浅粉色
      ];
      
      // 确保索引在范围内
      if (stageIndex >= 0) {
        return stageColors[stageIndex % stageColors.length];
      }
      
      return '';
    },
    
    // 返回今天
    goToToday() {
      console.log('返回今天');
      const today = new Date();
      const currentYear = today.getFullYear();
      const currentMonth = today.getMonth() + 1;
      const currentDate = today.getDate();
      
      this.setData({
        currentYear,
        currentMonth,
        currentDate
      });
      
      this.generateCalendar();
      
      const formattedDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(currentDate).padStart(2, '0')}`;
      this.triggerEvent('dateSelect', { date: formattedDate });
    }
  }
}) 
# AI服务集成说明

本项目已集成外部AI SDK，支持多种AI服务提供商，包括火山引擎豆包、OpenAI等。

## 功能特性

- 🤖 支持多种AI服务提供商
- 🔧 灵活的配置管理
- 💬 智能客服对话
- 📱 响应式UI设计
- 🔒 安全的API密钥管理

## 快速开始

### 1. 环境配置

复制环境配置文件：
```bash
cp .env.example .env.local
```

编辑 `.env.local` 文件，填入你的API密钥：
```env
# 火山引擎豆包AI配置
VITE_VOLCENGINE_API_KEY=your_actual_api_key_here
VITE_VOLCENGINE_BASE_URL=https://ark.cn-beijing.volces.com/api/v3
```

### 2. 获取API密钥

#### 火山引擎豆包
1. 访问 [火山引擎控制台](https://console.volcengine.com/)
2. 开通豆包大模型服务
3. 创建API密钥
4. 参考文档：https://www.volcengine.com/docs/82379/1449737

#### OpenAI（可选）
1. 访问 [OpenAI Platform](https://platform.openai.com/)
2. 创建API密钥
3. 配置相应的环境变量

### 3. 配置AI服务

启动项目后，访问AI设置页面进行配置：
1. 点击客服页面右上角的设置按钮
2. 选择AI服务提供商
3. 填入API密钥和其他配置
4. 测试连接
5. 保存配置

## 使用方法

### 客服对话
1. 从订单详情页点击"联系客服"按钮
2. 或直接访问 `/customer-service` 页面
3. 开始与AI客服对话

### 配置管理
- 访问 `/ai-settings` 页面进行配置
- 支持实时配置更新
- 配置数据本地存储

## 技术架构

### 核心文件

- `src/services/aiService.ts` - AI服务核心逻辑
- `src/config/aiConfig.ts` - 配置管理
- `src/views/CustomerServiceView.vue` - 客服对话界面
- `src/views/AISettingsView.vue` - AI配置界面

### 支持的AI提供商

- **火山引擎豆包** - 推荐使用
- **OpenAI** - 可选配置
- **自定义** - 支持其他兼容OpenAI API的服务

## 安全注意事项

1. **API密钥安全**
   - 不要将API密钥提交到代码仓库
   - 使用环境变量管理敏感信息
   - 定期轮换API密钥

2. **配置验证**
   - 系统会自动验证配置有效性
   - 无效配置会显示警告提示

3. **错误处理**
   - 完善的错误处理机制
   - 服务不可用时的降级策略

## 开发指南

### 添加新的AI提供商

1. 在 `AIProvider` 枚举中添加新提供商
2. 在 `AI_MODELS` 中添加对应模型
3. 在 `AIService` 类中实现相应的API调用逻辑

### 自定义配置

可以通过修改 `DEFAULT_CONFIG` 来设置默认配置值。

### 扩展功能

- 支持流式响应
- 对话历史管理
- 多轮对话上下文
- 自定义系统提示词

## 故障排除

### 常见问题

1. **API密钥无效**
   - 检查密钥是否正确
   - 确认服务是否已开通

2. **网络连接问题**
   - 检查网络连接
   - 确认API端点可访问

3. **配置丢失**
   - 检查本地存储
   - 重新配置AI服务

### 调试模式

开发环境下，可以在浏览器控制台查看详细的错误信息和API调用日志。

## 更新日志

- v1.0.0 - 初始版本，支持火山引擎豆包集成
- 支持多AI提供商配置
- 完整的UI配置界面
- 安全的密钥管理

## 技术支持

如有问题，请查看：
- [火山引擎文档](https://www.volcengine.com/docs/82379/1449737)
- 项目Issues
- 开发团队联系方式
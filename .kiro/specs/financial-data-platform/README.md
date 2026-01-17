# Financial Data Platform

> A comprehensive React-based admin system integrating AI Q&A, document management, stock data analysis, and system management.

## 📊 Project Overview

This platform integrates with a FastAPI backend (`http://121.196.147.222:8000`) to provide:

- 🤖 **AI Assistant**: RAG-based intelligent Q&A with document management
- 📈 **Stock Data**: Stock information, IPO data, and shareholder analysis
- 🔧 **System Management**: Data synchronization, cache management, and monitoring

## 🎯 Implementation Status

### Phase 1: Foundation ✅ COMPLETE

- [x] Project configuration and setup
- [x] API service layer (6 modules, 42 endpoints)
- [x] Router configuration (3 new modules)
- [x] Type definitions (all interfaces)

### Phase 2: UI Implementation ⏳ IN PROGRESS

- [ ] Localization files (Task 4)
- [ ] Dashboard page (Task 5)
- [ ] AI Assistant pages (Tasks 6-8)
- [ ] Stock Data pages (Tasks 9-11)
- [ ] System Management pages (Tasks 12-14)
- [ ] Error handling & loading states (Tasks 15-16)
- [ ] Performance optimization (Task 17)
- [ ] Responsive design (Task 18)
- [ ] Testing & documentation (Tasks 19-20)

**Progress: 3/20 tasks completed (15%)**

## 📁 Project Structure

```
.kiro/specs/financial-data-platform/
├── README.md                    # This file
├── requirements.md              # 12 detailed requirements
├── design.md                    # Complete architecture design
├── tasks.md                     # 20 implementation tasks
├── IMPLEMENTATION_GUIDE.md      # Detailed implementation guide
└── QUICK_REFERENCE.md           # Quick reference for developers

src/
├── api/                         # ✅ API service layer
│   ├── common/                  # Common types
│   ├── rag/                     # RAG Q&A APIs
│   ├── document/                # Document management APIs
│   ├── stock/                   # Stock information APIs
│   ├── ipo/                     # IPO data APIs
│   ├── shareholder/             # Shareholder APIs
│   └── system/                  # System management APIs
│
├── pages/                       # ⏳ Pages to implement
│   ├── dashboard/               # Overview dashboard
│   ├── ai-assistant/            # AI Q&A, docs, sessions
│   ├── stock-data/              # Stocks, IPO, shareholders
│   └── system/                  # Sync, cache, monitor
│
├── router/
│   └── routes/modules/          # ✅ Route configuration
│       ├── ai-assistant.ts      # AI Assistant routes
│       ├── stock-data.ts        # Stock Data routes
│       └── system.ts            # System routes (updated)
│
└── locales/                     # ⏳ Translations to add
    ├── zh-CN/                   # Chinese translations
    └── en-US/                   # English translations
```

## 🚀 Quick Start

### Prerequisites

- Node.js 16+
- npm or pnpm
- Backend API running at `http://121.196.147.222:8000`

### Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

### Access

- Development: `http://localhost:3333`
- Login with admin credentials
- Navigate to new menu items:
  - 智能助手 (AI Assistant)
  - 股票数据 (Stock Data)
  - 系统管理 (System Management)

## 📚 Documentation

| Document | Purpose |
|----------|---------|
| [requirements.md](./requirements.md) | Detailed requirements (12 user stories) |
| [design.md](./design.md) | Architecture and component design |
| [tasks.md](./tasks.md) | Implementation task list (20 tasks) |
| [IMPLEMENTATION_GUIDE.md](./IMPLEMENTATION_GUIDE.md) | Step-by-step implementation guide |
| [QUICK_REFERENCE.md](./QUICK_REFERENCE.md) | Quick reference for developers |

## 🔌 API Modules

### 1. RAG (Intelligent Q&A)
- Online/offline Q&A
- Streaming responses
- Session management
- Vector search

### 2. Document Management
- File upload (sync/async)
- Collection management
- Document listing
- Task status tracking

### 3. Stock Information
- Stock search and query
- Stock list with filters
- Data synchronization
- Statistics

### 4. IPO Data
- IPO query with filters
- IPO statistics
- Data crawling (multiple sources)
- Exchange-specific data

### 5. Shareholder Information
- Shareholder query
- Controlling shareholder
- Data refresh

### 6. System Management
- Health checks
- Cache management
- Session management
- System monitoring

## 🎨 Design Principles

### Clean & Professional
- Consistent spacing and typography
- Ant Design component library
- Professional color palette
- Clear visual hierarchy

### Well-Organized
- Logical menu structure
- Grouped related features
- Intuitive navigation
- Breadcrumb trails

### User-Friendly
- Clear error messages
- Loading indicators
- Success feedback
- Responsive design

## 🛠️ Technology Stack

- **Frontend**: React 18 + TypeScript
- **UI Library**: Ant Design + Ant Design Pro
- **State Management**: React Query (TanStack Query)
- **Routing**: React Router v6
- **HTTP Client**: ky
- **Build Tool**: Vite
- **Testing**: Vitest + React Testing Library
- **i18n**: react-i18next

## 📋 Implementation Checklist

### High Priority
- [ ] Dashboard with statistics
- [ ] Stock query page
- [ ] Shareholder information page
- [ ] Localization files

### Medium Priority
- [ ] AI Q&A interface
- [ ] Document management
- [ ] Session management
- [ ] IPO data page (enhance existing)

### Low Priority
- [ ] Data sync controls
- [ ] Cache management
- [ ] System monitoring
- [ ] Performance optimization

## 🧪 Testing Strategy

### Unit Tests
- API service functions
- Data transformation utilities
- Form validation logic

### Integration Tests
- API integration flows
- Multi-step workflows
- Session management

### Manual Testing
- All menu navigation
- API endpoint responses
- Error message display
- Loading states
- Pagination
- Filters
- File uploads
- Language switching
- Responsive design

## 🔐 Security

- API authentication with tokens
- Input validation
- XSS prevention
- HTTPS for API calls
- No sensitive data logging

## 🌐 Internationalization

### Supported Languages
- 🇨🇳 Chinese (zh-CN) - Primary
- 🇺🇸 English (en-US) - Secondary

### Translation Structure
```
common.*     - Common UI elements
dashboard.*  - Dashboard specific
ai.*         - AI Assistant module
stock.*      - Stock Data module
system.*     - System Management module
errors.*     - Error messages
```

## 📈 Performance Targets

- Initial load: < 2 seconds
- API response: < 500ms
- Page navigation: < 300ms
- Table rendering: < 100ms
- Bundle size: < 500KB (initial)

## 🐛 Known Issues

None yet - project is in initial implementation phase.

## 🤝 Contributing

This is a spec-driven development project. Follow these steps:

1. Read the requirements and design documents
2. Check the task list for next task
3. Implement according to the implementation guide
4. Test thoroughly
5. Update task status in tasks.md

## 📞 Support

For implementation questions:
- Refer to IMPLEMENTATION_GUIDE.md
- Check QUICK_REFERENCE.md
- Review existing IPO page implementation
- Consult Ant Design Pro documentation

## 🎯 Next Steps

**For the next session:**

1. Start with Task 4: Create localization files
2. Then Task 5: Implement Dashboard
3. Continue with high-priority pages

Use this prompt in your next session:
```
Continue implementing the Financial Data Platform.
Spec location: .kiro/specs/financial-data-platform/
Current progress: Tasks 1-3 completed (15%)
Next task: [Task number and name]
Refer to IMPLEMENTATION_GUIDE.md for details.
```

## 📄 License

[Your License Here]

## 👥 Authors

[Your Name/Team]

---

**Built with ❤️ using React + TypeScript + Ant Design**

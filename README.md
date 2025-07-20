# GYST - Get Your Shit Together

GYST is an AI-powered job application automation platform designed specifically for new graduates and early-career professionals. The platform automates the entire job search process from finding relevant positions to submitting tailored applications.

## 🚀 Features

- **AI-Powered Job Search**: Chatbot interface that understands natural language job preferences
- **Smart Job Discovery**: AI finds relevant opportunities across multiple platforms
- **Automated CV Customization**: AI tailors resumes and cover letters for each job application
- **Credit-Based System**: Pay-per-use model for searches and applications
- **Application Tracking**: Complete dashboard to monitor application progress
- **Professional Profile Management**: Centralized profile and CV management

## 🛠️ Tech Stack

### Frontend
- **Next.js 14** - App Router for modern React development
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first CSS framework
- **React** - Component-based UI

### Recommended Backend Technologies

#### Authentication & Database
- **Supabase** - PostgreSQL database with real-time subscriptions and built-in auth
- **Clerk** - Advanced authentication with social logins and user management
- **Alternative**: Auth0 for enterprise-grade authentication

#### AI & LLM Services
- **OpenAI GPT-4** - Main LLM for job search optimization and CV customization
- **DeepSeek** - Cost-effective alternative for certain AI tasks
- **Alternative**: Anthropic Claude for better reasoning tasks

#### Web Scraping & Data
- **BrightData** - Enterprise-grade web scraping with rotating proxies
- **SerpAPI** - Google Search API for job listings
- **Alternative**: Puppeteer + Playwright for custom scraping

#### Search & Discovery
- **Perplexity API** - Real-time web search and data retrieval
- **Alternative**: Tavily AI for web search capabilities

#### Additional Services
- **Pinecone** - Vector database for semantic job matching
- **Stripe** - Payment processing for credits
- **Resend** - Email notifications and communication
- **Vercel** - Deployment and hosting
- **Upstash Redis** - Caching and session storage

## 📁 Project Structure

```
src/
├── app/
│   ├── (landing)/
│   │   └── page.tsx              # Landing page
│   ├── auth/
│   │   ├── layout.tsx            # Auth layout
│   │   ├── login/page.tsx        # Login page
│   │   └── signup/page.tsx       # Signup page
│   └── app/
│       ├── layout.tsx            # Protected app layout
│       ├── page.tsx              # Dashboard
│       ├── search/page.tsx       # Job search chatbot
│       ├── applications/page.tsx # Application tracking
│       └── profile/page.tsx      # Profile management
```

## 🚀 Getting Started

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Run the development server**
   ```bash
   npm run dev
   ```

3. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 🔧 Architecture Recommendations

### Agentic System with MCP Servers
For maximum flexibility and scalability, consider implementing an agentic architecture:

1. **MCP (Model Context Protocol) Servers**
   - Job Search Agent: Handles job discovery and filtering
   - Application Agent: Manages CV customization and form filling
   - Tracking Agent: Monitors application status and responses
   - Notification Agent: Handles alerts and daily job searches

2. **Tools Integration**
   - Web scraping tools for job site automation
   - PDF generation tools for CV customization
   - Browser automation tools for application submission
   - Email parsing tools for response tracking

### Workflow Design
1. **Job Discovery**: AI analyzes user preferences → Web scraping → Job filtering
2. **Application Preparation**: CV analysis → Job-specific customization → Cover letter generation
3. **Application Submission**: Form analysis → Automated filling → Submission tracking
4. **Progress Monitoring**: Status checking → Response parsing → User notifications

## 🎯 Next Steps

### Phase 1: Foundation (Weeks 1-2)
- [ ] Set up Supabase database and authentication
- [ ] Implement user registration and profile management
- [ ] Create basic credit system

### Phase 2: Core Features (Weeks 3-4)
- [ ] Integrate OpenAI for job search chatbot
- [ ] Set up BrightData for web scraping
- [ ] Build job search and filtering system

### Phase 3: Automation (Weeks 5-6)
- [ ] Implement CV customization engine
- [ ] Build application form automation
- [ ] Create application tracking system

### Phase 4: Advanced Features (Weeks 7-8)
- [ ] Add daily job search alerts
- [ ] Implement response parsing
- [ ] Build analytics dashboard

### Phase 5: Production (Weeks 9-10)
- [ ] Payment integration with Stripe
- [ ] Performance optimization
- [ ] Security audit and deployment

## 🔐 Security Considerations

- Implement proper authentication and authorization
- Encrypt sensitive user data and CVs
- Use secure proxy rotation for web scraping
- Implement rate limiting and abuse prevention
- Regular security audits and penetration testing

## 💡 Business Model

- **Freemium**: Basic features with limited credits
- **Pay-per-use**: Credit-based pricing for searches and applications
- **Subscription**: Monthly plans with included credits
- **Enterprise**: Custom solutions for universities and career centers

## 📈 Scaling Considerations

- Implement queue systems for job processing
- Use CDN for static assets and CV storage
- Implement horizontal scaling for web scraping
- Use database read replicas for analytics
- Implement proper monitoring and alerting

## 🤝 Contributing

This project is in active development. Please follow the established patterns and submit PRs for review.

## 📄 License

All rights reserved. This is a proprietary project.

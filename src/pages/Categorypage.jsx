import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  Clock, User, TrendingUp, ChevronRight, Flame,
  Globe, BarChart2, Cpu, Trophy, FileText, PenLine,
  Zap, Newspaper, RefreshCw, BookOpen, Eye,
} from "lucide-react";

const API_BASE = "http://127.0.0.1:8000/api";

// ─────────────────────────────────────────────
//  Static dummy data — all 15 categories
// ─────────────────────────────────────────────
const DUMMY_ARTICLES = {
  "breaking-news": [
    { id: 1, title: "India's Economy Grows at 7.2% in Q3 2026", description: "India's GDP growth rate surpasses expectations as manufacturing and services sectors show strong performance across all major states.", author: "Rahul Sharma", published_at: "2026-03-11", image: "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=600&auto=format&fit=crop&q=60", views: 12400 },
    { id: 2, title: "Supreme Court Rules on Electoral Bonds Case", description: "The Supreme Court of India delivers a landmark judgment on the electoral bonds scheme, impacting political funding transparency.", author: "Priya Mehta", published_at: "2026-03-10", image: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=600&auto=format&fit=crop&q=60", views: 9800 },
    { id: 3, title: "India Launches New Space Mission to Mars", description: "ISRO successfully launches its second Mars mission with advanced scientific instruments to study Martian atmosphere.", author: "Amit Singh", published_at: "2026-03-09", image: "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=600&auto=format&fit=crop&q=60", views: 15600 },
    { id: 4, title: "New Education Policy Implementation Updates", description: "Government announces major updates to the National Education Policy with focus on skill development and digital literacy.", author: "Neha Gupta", published_at: "2026-03-08", image: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=600&auto=format&fit=crop&q=60", views: 7200 },
    { id: 5, title: "India Signs Trade Agreement with EU", description: "India and European Union finalize historic free trade agreement boosting bilateral trade to $200 billion.", author: "Vikram Patel", published_at: "2026-03-07", image: "https://images.unsplash.com/photo-1521791136064-7986c2920216?w=600&auto=format&fit=crop&q=60", views: 8900 },
    { id: 6, title: "Monsoon Forecast 2026: Normal Rainfall Expected", description: "IMD predicts normal monsoon season for 2026 bringing relief to farmers across the country.", author: "Sunita Rao", published_at: "2026-03-06", image: "https://images.unsplash.com/photo-1534088568595-a066f410bcda?w=600&auto=format&fit=crop&q=60", views: 6100 },
    { id: 7, title: "India's Defence Budget Rises to ₹7 Lakh Crore", description: "Government allocates record funds to defence as India aims for self-reliance in military manufacturing.", author: "Arjun Nair", published_at: "2026-03-05", image: "https://images.unsplash.com/photo-1580130775562-0ef92da028de?w=600&auto=format&fit=crop&q=60", views: 11300 },
    { id: 8, title: "PM Modi Inaugurates World's Largest Solar Park", description: "The 30 GW Rann of Kutch Solar Park inaugurated, making it the largest solar installation in the world.", author: "Divya Kapoor", published_at: "2026-03-04", image: "https://images.unsplash.com/photo-1509391366360-2e959784a276?w=600&auto=format&fit=crop&q=60", views: 13700 },
  ],
  "state-of-bharat": [
    { id: 1, title: "Maharashtra Launches ₹50,000 Crore Infrastructure Plan", description: "Maharashtra government announces massive infrastructure development plan covering roads, metro, and ports.", author: "Aditya Joshi", published_at: "2026-03-11", image: "https://images.unsplash.com/photo-1570168007204-dfb528c6958f?w=600&auto=format&fit=crop&q=60", views: 8400 },
    { id: 2, title: "UP's Expressway Network Expands to 2000 KM", description: "Uttar Pradesh adds 500 km of new expressways connecting remote districts to major cities.", author: "Ravi Kumar", published_at: "2026-03-10", image: "https://images.unsplash.com/photo-1545558014-8692077e9b5c?w=600&auto=format&fit=crop&q=60", views: 6700 },
    { id: 3, title: "Kerala Model of Health Gets Global Recognition", description: "Kerala's public healthcare system receives WHO recognition as a model for developing nations.", author: "Maya Nair", published_at: "2026-03-09", image: "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=600&auto=format&fit=crop&q=60", views: 9200 },
    { id: 4, title: "Gujarat Becomes India's Top Export State", description: "Gujarat surpasses Maharashtra in merchandise exports for the first time, driven by pharma and chemicals.", author: "Dhruv Shah", published_at: "2026-03-08", image: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=600&auto=format&fit=crop&q=60", views: 5400 },
    { id: 5, title: "Rajasthan Solar Power Capacity Hits 20 GW", description: "Rajasthan achieves a major milestone in renewable energy with 20 GW of solar power capacity.", author: "Kavita Sharma", published_at: "2026-03-07", image: "https://images.unsplash.com/photo-1509391366360-2e959784a276?w=600&auto=format&fit=crop&q=60", views: 7800 },
    { id: 6, title: "Tamil Nadu IT Exports Cross ₹2 Lakh Crore", description: "Tamil Nadu's IT and software services exports reach a historic milestone of ₹2 lakh crore.", author: "Karthik Rajan", published_at: "2026-03-06", image: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&auto=format&fit=crop&q=60", views: 6300 },
    { id: 7, title: "Bengal Leads in Handloom Exports", description: "West Bengal's handloom sector records 40% export growth, reaching new markets in Europe and the US.", author: "Ananya Das", published_at: "2026-03-05", image: "https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=600&auto=format&fit=crop&q=60", views: 4100 },
    { id: 8, title: "Madhya Pradesh Tops Wheat Production", description: "MP becomes India's top wheat-producing state for the second consecutive year, crossing 25 million tonnes.", author: "Suresh Tiwari", published_at: "2026-03-04", image: "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=600&auto=format&fit=crop&q=60", views: 5600 },
  ],
  "bharat-economy": [
    { id: 1, title: "India's GDP to Cross $5 Trillion by 2027", description: "IMF projects India to become the world's third largest economy by 2027, crossing the $5 trillion GDP mark.", author: "Rahul Sharma", published_at: "2026-03-11", image: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=600&auto=format&fit=crop&q=60", views: 14200 },
    { id: 2, title: "FDI Inflows Hit Record $85 Billion in 2025-26", description: "India attracts record foreign direct investment across manufacturing, technology, and renewable energy sectors.", author: "Priya Mehta", published_at: "2026-03-10", image: "https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=600&auto=format&fit=crop&q=60", views: 9600 },
    { id: 3, title: "Union Budget 2026: Key Highlights", description: "Finance Minister presents a growth-oriented budget with focus on infrastructure, agriculture, and digital economy.", author: "Amit Singh", published_at: "2026-03-09", image: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600&auto=format&fit=crop&q=60", views: 18300 },
    { id: 4, title: "PLI Scheme Creates 1 Million Jobs", description: "Production Linked Incentive scheme successfully generates over 1 million direct jobs in India's manufacturing sector.", author: "Neha Gupta", published_at: "2026-03-08", image: "https://images.unsplash.com/photo-1565514020179-026b92b84bb6?w=600&auto=format&fit=crop&q=60", views: 7700 },
    { id: 5, title: "India's Inflation Drops to 4.1% in February 2026", description: "Retail inflation eases to a 2-year low, giving RBI room to cut interest rates in upcoming policy meeting.", author: "Vikram Patel", published_at: "2026-03-07", image: "https://images.unsplash.com/photo-1543286386-713bdd548da4?w=600&auto=format&fit=crop&q=60", views: 8100 },
    { id: 6, title: "MSME Sector Contributes 35% to India's GDP", description: "Ministry of MSME reports the sector now contributes 35% to GDP and employs over 120 million people.", author: "Sunita Rao", published_at: "2026-03-06", image: "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=600&auto=format&fit=crop&q=60", views: 6900 },
    { id: 7, title: "India Overtakes Japan as 3rd Largest Auto Market", description: "India's auto sector registers record sales, overtaking Japan to become the world's third largest automobile market.", author: "Deepak Mehta", published_at: "2026-03-05", image: "https://images.unsplash.com/photo-1553778263-73a83bab9b0c?w=600&auto=format&fit=crop&q=60", views: 11500 },
    { id: 8, title: "Agriculture Exports Cross $60 Billion", description: "India's agricultural exports reach a record $60 billion, with spices, rice and processed food leading growth.", author: "Kavita Sharma", published_at: "2026-03-04", image: "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=600&auto=format&fit=crop&q=60", views: 5200 },
  ],
  "bfsi": [
    { id: 1, title: "RBI Cuts Repo Rate by 25 Basis Points", description: "Reserve Bank of India reduces repo rate to 6.25% to boost economic growth and credit offtake.", author: "Rahul Sharma", published_at: "2026-03-11", image: "https://images.unsplash.com/photo-1601597111158-2fceff292cdc?w=600&auto=format&fit=crop&q=60", views: 16800 },
    { id: 2, title: "UPI Transactions Cross 15 Billion in February", description: "India's Unified Payments Interface sets new record with 15 billion transactions worth ₹20 lakh crore.", author: "Priya Mehta", published_at: "2026-03-10", image: "https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=600&auto=format&fit=crop&q=60", views: 12300 },
    { id: 3, title: "SBI Reports ₹18,000 Crore Quarterly Profit", description: "State Bank of India posts record quarterly profit driven by strong retail loan growth and lower NPAs.", author: "Amit Singh", published_at: "2026-03-09", image: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=600&auto=format&fit=crop&q=60", views: 9400 },
    { id: 4, title: "SEBI Introduces New F&O Trading Rules", description: "Securities and Exchange Board of India tightens derivatives trading norms to protect retail investors.", author: "Neha Gupta", published_at: "2026-03-08", image: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=600&auto=format&fit=crop&q=60", views: 14100 },
    { id: 5, title: "India's Insurance Penetration Rises to 5.2%", description: "Insurance sector sees significant growth as digital distribution and awareness campaigns boost penetration.", author: "Vikram Patel", published_at: "2026-03-07", image: "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=600&auto=format&fit=crop&q=60", views: 7600 },
    { id: 6, title: "PhonePe, Paytm Battle for NBFC Licenses", description: "Leading fintech companies race to obtain NBFC licenses as RBI opens doors for digital lending expansion.", author: "Sunita Rao", published_at: "2026-03-06", image: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=600&auto=format&fit=crop&q=60", views: 8800 },
    { id: 7, title: "Gold Loan NBFCs See 60% Growth in FY26", description: "Gold loan companies record explosive growth as households unlock value from idle gold holdings.", author: "Arjun Nair", published_at: "2026-03-05", image: "https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=600&auto=format&fit=crop&q=60", views: 6400 },
    { id: 8, title: "Stock Market: Nifty Crosses 30,000 Mark", description: "NSE Nifty 50 breaches 30,000 for the first time, reflecting strong investor confidence in India's growth story.", author: "Deepak Mehta", published_at: "2026-03-04", image: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=600&auto=format&fit=crop&q=60", views: 19200 },
  ],
  "bharat-explainers": [
    { id: 1, title: "What is the New Income Tax Bill 2026?", description: "A comprehensive explainer on the new Income Tax Bill, what changes it brings and how it affects every taxpayer.", author: "Rahul Sharma", published_at: "2026-03-11", image: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600&auto=format&fit=crop&q=60", views: 22400 },
    { id: 2, title: "Explained: How GST Council Works", description: "Understanding the composition, powers and decision-making process of India's Goods and Services Tax Council.", author: "Priya Mehta", published_at: "2026-03-10", image: "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=600&auto=format&fit=crop&q=60", views: 11800 },
    { id: 3, title: "What is One Nation One Election?", description: "Everything you need to know about the proposal to hold simultaneous elections for Lok Sabha and State Assemblies.", author: "Amit Singh", published_at: "2026-03-09", image: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=600&auto=format&fit=crop&q=60", views: 17600 },
    { id: 4, title: "Understanding India's Semiconductor Mission", description: "Deep dive into India's ambitious plan to build a domestic semiconductor ecosystem and chip manufacturing industry.", author: "Neha Gupta", published_at: "2026-03-08", image: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&auto=format&fit=crop&q=60", views: 9300 },
    { id: 5, title: "How Does ISRO Fund Its Space Missions?", description: "Explainer on ISRO's funding model, commercial ventures and how India manages cost-effective space missions.", author: "Vikram Patel", published_at: "2026-03-07", image: "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=600&auto=format&fit=crop&q=60", views: 13400 },
    { id: 6, title: "What is the Waqf Amendment Bill?", description: "A balanced explainer on the controversial Waqf Amendment Bill, its provisions and implications.", author: "Sunita Rao", published_at: "2026-03-06", image: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=600&auto=format&fit=crop&q=60", views: 19700 },
    { id: 7, title: "CAA Explained: Who Benefits and How?", description: "A simple explainer on the Citizenship Amendment Act — who qualifies, the process, and legal challenges.", author: "Arjun Nair", published_at: "2026-03-05", image: "https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=600&auto=format&fit=crop&q=60", views: 24100 },
    { id: 8, title: "India's New Criminal Laws: Everything You Must Know", description: "BNS, BNSS and BSA replace IPC, CrPC and Indian Evidence Act. Here's what changed and what stayed the same.", author: "Divya Kapoor", published_at: "2026-03-04", image: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=600&auto=format&fit=crop&q=60", views: 20900 },
  ],
  "bharat-numbers": [
    { id: 1, title: "India in Numbers: 2025-26 Economic Report Card", description: "Key economic indicators — GDP, inflation, exports, FDI — that defined India's economic performance in 2025-26.", author: "Rahul Sharma", published_at: "2026-03-11", image: "https://images.unsplash.com/photo-1543286386-713bdd548da4?w=600&auto=format&fit=crop&q=60", views: 13200 },
    { id: 2, title: "₹50 Lakh Crore: India's Digital Economy by 2026", description: "Data-driven analysis of how India's digital economy has grown and what the numbers tell us about the future.", author: "Priya Mehta", published_at: "2026-03-10", image: "https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=600&auto=format&fit=crop&q=60", views: 9800 },
    { id: 3, title: "500 Million: India's Middle Class by 2030", description: "Statistical projections show India's middle class will grow to 500 million by 2030, reshaping consumer markets.", author: "Amit Singh", published_at: "2026-03-09", image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&auto=format&fit=crop&q=60", views: 8600 },
    { id: 4, title: "India's Export Data: Sector-wise Breakdown 2026", description: "Comprehensive data analysis of India's exports by sector, destination, and growth trajectory in 2025-26.", author: "Neha Gupta", published_at: "2026-03-08", image: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=600&auto=format&fit=crop&q=60", views: 7100 },
    { id: 5, title: "10 Crore Jobs Created Under Make in India", description: "Government data reveals 10 crore jobs created under Make in India initiative across manufacturing sectors.", author: "Vikram Patel", published_at: "2026-03-07", image: "https://images.unsplash.com/photo-1565514020179-026b92b84bb6?w=600&auto=format&fit=crop&q=60", views: 11800 },
    { id: 6, title: "India's Unicorn Count Crosses 150", description: "India now has over 150 unicorn startups valued at $1 billion or more, second only to US and China.", author: "Sunita Rao", published_at: "2026-03-06", image: "https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=600&auto=format&fit=crop&q=60", views: 10300 },
    { id: 7, title: "India's Population Data: Census 2025 Highlights", description: "Key findings from India's first digital census — population, literacy, urbanisation and more.", author: "Arjun Nair", published_at: "2026-03-05", image: "https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=600&auto=format&fit=crop&q=60", views: 15600 },
    { id: 8, title: "7 Charts That Explain India's Growth Story", description: "Seven data visualisations that capture India's economic transformation from 1991 to 2026.", author: "Divya Kapoor", published_at: "2026-03-04", image: "https://images.unsplash.com/photo-1543286386-713bdd548da4?w=600&auto=format&fit=crop&q=60", views: 18900 },
  ],
  "bharat-opinions": [
    { id: 1, title: "Why India Must Prioritize Manufacturing Over Services", description: "An expert opinion on why India needs to shift its economic strategy towards manufacturing for mass employment.", author: "Dr. Arvind Panagariya", published_at: "2026-03-11", image: "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=600&auto=format&fit=crop&q=60", views: 9800 },
    { id: 2, title: "The Case for a Uniform Civil Code in India", description: "A legal expert makes the case for implementing a Uniform Civil Code and addresses common concerns.", author: "Adv. Pinky Anand", published_at: "2026-03-10", image: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=600&auto=format&fit=crop&q=60", views: 14600 },
    { id: 3, title: "India's Foreign Policy Needs a Reset", description: "A foreign policy expert argues India must rethink its approach to multilateralism in a changing world order.", author: "Shyam Saran", published_at: "2026-03-09", image: "https://images.unsplash.com/photo-1521791136064-7986c2920216?w=600&auto=format&fit=crop&q=60", views: 7400 },
    { id: 4, title: "Why India's Startup Ecosystem Needs Regulation", description: "A venture capitalist argues that India's booming startup ecosystem needs sensible regulation to mature.", author: "Mahesh Murthy", published_at: "2026-03-08", image: "https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=600&auto=format&fit=crop&q=60", views: 8200 },
    { id: 5, title: "The Media's Responsibility in a Democracy", description: "A senior journalist reflects on how Indian media must uphold its democratic duty in an era of misinformation.", author: "Rajdeep Sardesai", published_at: "2026-03-07", image: "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=600&auto=format&fit=crop&q=60", views: 12100 },
    { id: 6, title: "India's Climate Commitments: Are We on Track?", description: "An environmental economist assesses India's progress on Paris Agreement commitments.", author: "Dr. Sunita Narain", published_at: "2026-03-06", image: "https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=600&auto=format&fit=crop&q=60", views: 6700 },
    { id: 7, title: "Should India Have a Two-Party Political System?", description: "A political scientist debates the merits and risks of moving towards a two-party democratic system.", author: "Prof. Pratap Bhanu Mehta", published_at: "2026-03-05", image: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=600&auto=format&fit=crop&q=60", views: 10900 },
    { id: 8, title: "Caste Census: Necessary or Divisive?", description: "Experts debate whether a caste-based census will help build a more equitable society or deepen divisions.", author: "Yogendra Yadav", published_at: "2026-03-04", image: "https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=600&auto=format&fit=crop&q=60", views: 17300 },
  ],
  "bharat-startups": [
    { id: 1, title: "Zepto Raises $500 Million, Eyes IPO in 2027", description: "Quick commerce startup Zepto secures massive funding round as it prepares for a public market debut.", author: "Rahul Sharma", published_at: "2026-03-11", image: "https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=600&auto=format&fit=crop&q=60", views: 13400 },
    { id: 2, title: "Bharat's Agritech Startups Transforming Rural India", description: "How a new wave of agricultural technology startups is bringing digital solutions to India's 600 million farmers.", author: "Priya Mehta", published_at: "2026-03-10", image: "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=600&auto=format&fit=crop&q=60", views: 8700 },
    { id: 3, title: "Ola Electric Becomes India's Top EV Brand", description: "Ola Electric surpasses traditional automakers to become India's best-selling electric vehicle brand in 2026.", author: "Amit Singh", published_at: "2026-03-09", image: "https://images.unsplash.com/photo-1593941707882-a5bba14938c7?w=600&auto=format&fit=crop&q=60", views: 10200 },
    { id: 4, title: "Tier-2 City Startups: India's Next Growth Engine", description: "Startups from Jaipur, Indore, Coimbatore and Surat are challenging the dominance of Bengaluru and Mumbai.", author: "Neha Gupta", published_at: "2026-03-08", image: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=600&auto=format&fit=crop&q=60", views: 9100 },
    { id: 5, title: "India's Edtech Sector Finds Its Footing", description: "After the 2022-23 downturn, India's education technology sector is rebuilding with sustainable business models.", author: "Vikram Patel", published_at: "2026-03-07", image: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=600&auto=format&fit=crop&q=60", views: 7300 },
    { id: 6, title: "ONDC: Democratizing E-Commerce for Small Businesses", description: "Open Network for Digital Commerce is helping millions of small retailers compete with Amazon and Flipkart.", author: "Sunita Rao", published_at: "2026-03-06", image: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=600&auto=format&fit=crop&q=60", views: 11600 },
    { id: 7, title: "India's Healthtech Unicorns Race to Profitability", description: "Healthcare technology startups shift focus from growth to profitability as investor expectations change.", author: "Arjun Nair", published_at: "2026-03-05", image: "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=600&auto=format&fit=crop&q=60", views: 6800 },
    { id: 8, title: "D2C Brands: India's Next Consumer Revolution", description: "Direct-to-consumer brands are disrupting FMCG giants with niche products and digital-first strategies.", author: "Divya Kapoor", published_at: "2026-03-04", image: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=600&auto=format&fit=crop&q=60", views: 8400 },
  ],
  "sports": [
    { id: 1, title: "India Wins ICC Champions Trophy 2026", description: "Team India lifts the ICC Champions Trophy after a thrilling final against Australia at Wankhede Stadium.", author: "Arun Kumar", published_at: "2026-03-11", image: "https://images.unsplash.com/photo-1540747913346-19212a729c5a?w=600&auto=format&fit=crop&q=60", views: 28400 },
    { id: 2, title: "Neeraj Chopra Breaks World Javelin Record", description: "India's golden boy Neeraj Chopra sets a new world record of 92.5m at the Diamond League meet in Zurich.", author: "Ravi Kumar", published_at: "2026-03-10", image: "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=600&auto=format&fit=crop&q=60", views: 19600 },
    { id: 3, title: "IPL 2026: Mumbai Indians Retain Top Spot", description: "Mumbai Indians dominate the IPL 2026 season with five consecutive wins, powered by young Indian talent.", author: "Suresh Menon", published_at: "2026-03-09", image: "https://images.unsplash.com/photo-1531415074968-036ba1b575da?w=600&auto=format&fit=crop&q=60", views: 22100 },
    { id: 4, title: "India Qualifies for 2026 FIFA World Cup", description: "Historic moment as India qualifies for FIFA World Cup for the first time in history after wins in AFC qualifiers.", author: "Vikram Patel", published_at: "2026-03-08", image: "https://images.unsplash.com/photo-1553778263-73a83bab9b0c?w=600&auto=format&fit=crop&q=60", views: 34700 },
    { id: 5, title: "PV Sindhu Wins Her Third All England Title", description: "Badminton star PV Sindhu claims her third All England Open title defeating world number one in straight sets.", author: "Ananya Sharma", published_at: "2026-03-07", image: "https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=600&auto=format&fit=crop&q=60", views: 16300 },
    { id: 6, title: "Pro Kabaddi League Breaks Viewership Records", description: "PKL Season 12 becomes India's most-watched domestic sports league surpassing IPL in rural viewership.", author: "Deepak Mehta", published_at: "2026-03-06", image: "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=600&auto=format&fit=crop&q=60", views: 12800 },
    { id: 7, title: "Indian Chess Federation Produces 100th GM", description: "India celebrates its 100th Grandmaster — a historic milestone in the country's chess journey.", author: "Arjun Nair", published_at: "2026-03-05", image: "https://images.unsplash.com/photo-1529699211952-734e80c4d42b?w=600&auto=format&fit=crop&q=60", views: 9200 },
    { id: 8, title: "India's 2028 Olympics Medal Target: 25 Medals", description: "Sports Authority of India reveals ambitious target of 25 medals at Los Angeles Olympics in 2028.", author: "Divya Kapoor", published_at: "2026-03-04", image: "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=600&auto=format&fit=crop&q=60", views: 14100 },
  ],
  "world-news": [
    { id: 1, title: "G20 Summit 2026: Key Outcomes and Agreements", description: "World leaders gather in Brazil for G20 summit, reaching agreements on climate finance and AI governance.", author: "Rahul Sharma", published_at: "2026-03-11", image: "https://images.unsplash.com/photo-1521791136064-7986c2920216?w=600&auto=format&fit=crop&q=60", views: 11200 },
    { id: 2, title: "US-China Trade War Enters New Phase", description: "Washington imposes fresh tariffs on Chinese goods as trade tensions escalate ahead of US midterm elections.", author: "Priya Mehta", published_at: "2026-03-10", image: "https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=600&auto=format&fit=crop&q=60", views: 9700 },
    { id: 3, title: "Ukraine-Russia Conflict: Latest Developments", description: "Diplomatic efforts intensify as European leaders push for ceasefire negotiations in the ongoing conflict.", author: "Amit Singh", published_at: "2026-03-09", image: "https://images.unsplash.com/photo-1494022299300-899b96e49893?w=600&auto=format&fit=crop&q=60", views: 14300 },
    { id: 4, title: "Middle East Peace Talks Resume in Cairo", description: "Renewed diplomatic efforts bring key stakeholders to Cairo for fresh round of Middle East peace negotiations.", author: "Neha Gupta", published_at: "2026-03-08", image: "https://images.unsplash.com/photo-1461360370896-922624d12aa1?w=600&auto=format&fit=crop&q=60", views: 8600 },
    { id: 5, title: "UN Climate Summit Sets New Emission Targets", description: "Nations agree to new, more ambitious emission reduction targets at emergency UN climate summit in Geneva.", author: "Vikram Patel", published_at: "2026-03-07", image: "https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=600&auto=format&fit=crop&q=60", views: 10100 },
    { id: 6, title: "Global AI Regulation Framework Proposed by EU", description: "European Union proposes comprehensive global framework for regulating artificial intelligence development.", author: "Sunita Rao", published_at: "2026-03-06", image: "https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=600&auto=format&fit=crop&q=60", views: 7800 },
    { id: 7, title: "BRICS Expands: 5 New Nations Join Bloc", description: "BRICS formally welcomes five new member nations at its annual summit, reshaping the global economic order.", author: "Arjun Nair", published_at: "2026-03-05", image: "https://images.unsplash.com/photo-1521791136064-7986c2920216?w=600&auto=format&fit=crop&q=60", views: 12700 },
    { id: 8, title: "Japan-India Strategic Partnership Deepens", description: "Japan and India sign comprehensive defence and technology partnership covering semiconductors and quantum computing.", author: "Divya Kapoor", published_at: "2026-03-04", image: "https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=600&auto=format&fit=crop&q=60", views: 8400 },
  ],
  "technology": [
    { id: 1, title: "India Launches Its First AI Supercomputer", description: "Government inaugurates AIRAWAT, India's most powerful AI supercomputer with 200 petaflops computing capacity.", author: "Rahul Sharma", published_at: "2026-03-11", image: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&auto=format&fit=crop&q=60", views: 17400 },
    { id: 2, title: "5G Reaches 500 Million Indians: Jio, Airtel Battle", description: "India's 5G rollout hits a major milestone as Jio and Airtel compete to cover the last mile of rural connectivity.", author: "Priya Mehta", published_at: "2026-03-10", image: "https://images.unsplash.com/photo-1484863137850-59afcfe05386?w=600&auto=format&fit=crop&q=60", views: 12600 },
    { id: 3, title: "India's Semiconductor Fab Gets Ready in Sanand", description: "First made-in-India semiconductor chip rolls off the production line at the Tata Electronics fab in Sanand, Gujarat.", author: "Amit Singh", published_at: "2026-03-09", image: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&auto=format&fit=crop&q=60", views: 14900 },
    { id: 4, title: "Cyber Attacks on Indian Banks Rise 200%", description: "CERT-In reports alarming rise in sophisticated cyber attacks targeting Indian banking and financial institutions.", author: "Neha Gupta", published_at: "2026-03-08", image: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=600&auto=format&fit=crop&q=60", views: 19300 },
    { id: 5, title: "DigiYatra Expands to All 100 Indian Airports", description: "Government's facial recognition-based DigiYatra system now operational at all 100 airports across India.", author: "Vikram Patel", published_at: "2026-03-07", image: "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=600&auto=format&fit=crop&q=60", views: 8700 },
    { id: 6, title: "India's IT Industry Revenue Hits $300 Billion", description: "NASSCOM reports India's IT-BPM industry crosses $300 billion revenue mark, employing 6 million professionals.", author: "Sunita Rao", published_at: "2026-03-06", image: "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=600&auto=format&fit=crop&q=60", views: 11200 },
    { id: 7, title: "India's 6G Research Program Gets ₹10,000 Crore", description: "Government approves massive funding for 6G research as India aims to be a global technology standard-setter.", author: "Arjun Nair", published_at: "2026-03-05", image: "https://images.unsplash.com/photo-1484863137850-59afcfe05386?w=600&auto=format&fit=crop&q=60", views: 9800 },
    { id: 8, title: "Tata, Reliance Enter Quantum Computing Race", description: "India's corporate giants announce major quantum computing investments as the technology approaches commercial viability.", author: "Divya Kapoor", published_at: "2026-03-04", image: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&auto=format&fit=crop&q=60", views: 13600 },
  ],
  "ai": [
    { id: 1, title: "India's BharatGPT Launches With 22 Languages", description: "India's homegrown large language model BharatGPT goes live supporting all 22 scheduled languages of the Constitution.", author: "Rahul Sharma", published_at: "2026-03-11", image: "https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=600&auto=format&fit=crop&q=60", views: 21600 },
    { id: 2, title: "AI in Healthcare: How India is Detecting Cancer Early", description: "Indian startups use AI to detect cancer and diabetic retinopathy in rural areas where doctors are scarce.", author: "Priya Mehta", published_at: "2026-03-10", image: "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=600&auto=format&fit=crop&q=60", views: 14200 },
    { id: 3, title: "ChatGPT vs BharatGPT: A Detailed Comparison", description: "Detailed comparison of OpenAI's ChatGPT and India's BharatGPT across accuracy, language support and use cases.", author: "Amit Singh", published_at: "2026-03-09", image: "https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=600&auto=format&fit=crop&q=60", views: 28700 },
    { id: 4, title: "India's AI Policy: What Businesses Need to Know", description: "Government releases draft national AI policy outlining regulations, ethics guidelines and investment priorities.", author: "Neha Gupta", published_at: "2026-03-08", image: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=600&auto=format&fit=crop&q=60", views: 11300 },
    { id: 5, title: "AI Judges in Indian Courts? Debate Intensifies", description: "Legal community debates pilot program to use AI for case scheduling and routine judgments in lower courts.", author: "Vikram Patel", published_at: "2026-03-07", image: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=600&auto=format&fit=crop&q=60", views: 16800 },
    { id: 6, title: "Generative AI Creates 500,000 New Jobs in India", description: "Contrary to fears, generative AI boom creates half a million new job roles in India's technology sector.", author: "Sunita Rao", published_at: "2026-03-06", image: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&auto=format&fit=crop&q=60", views: 13100 },
    { id: 7, title: "India's AI Startups Raise $3 Billion in 2025", description: "Indian artificial intelligence startups attracted record funding in 2025, led by healthcare and fintech applications.", author: "Arjun Nair", published_at: "2026-03-05", image: "https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=600&auto=format&fit=crop&q=60", views: 9700 },
    { id: 8, title: "DRDO Uses AI for Border Surveillance", description: "Defence Research and Development Organisation deploys AI-powered surveillance systems along India's borders.", author: "Divya Kapoor", published_at: "2026-03-04", image: "https://images.unsplash.com/photo-1580130775562-0ef92da028de?w=600&auto=format&fit=crop&q=60", views: 18400 },
  ],
  "bharat-2047": [
    { id: 1, title: "Viksit Bharat @2047: Complete Roadmap", description: "Government releases comprehensive roadmap for making India a developed nation by its centenary of independence in 2047.", author: "Rahul Sharma", published_at: "2026-03-11", image: "https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=600&auto=format&fit=crop&q=60", views: 19800 },
    { id: 2, title: "India's Space Economy: $100 Billion Target by 2047", description: "ISRO and IN-SPACe outline ambitious plans to capture 10% of global space economy by India's centenary.", author: "Priya Mehta", published_at: "2026-03-10", image: "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=600&auto=format&fit=crop&q=60", views: 12400 },
    { id: 3, title: "100% Renewable Energy: India's 2047 Green Goal", description: "Ministry of New and Renewable Energy charts pathway for India to achieve 100% renewable energy by 2047.", author: "Amit Singh", published_at: "2026-03-09", image: "https://images.unsplash.com/photo-1509391366360-2e959784a276?w=600&auto=format&fit=crop&q=60", views: 10700 },
    { id: 4, title: "India's Defense Self-Reliance Mission Accelerates", description: "Atmanirbhar Bharat in defense: India targets 70% domestic defense production by 2030 and 90% by 2047.", author: "Neha Gupta", published_at: "2026-03-08", image: "https://images.unsplash.com/photo-1580130775562-0ef92da028de?w=600&auto=format&fit=crop&q=60", views: 14200 },
    { id: 5, title: "Smart Cities 2.0: 200 Cities by 2047", description: "Urban development ministry unveils Smart Cities 2.0 with focus on sustainability, mobility and digital governance.", author: "Vikram Patel", published_at: "2026-03-07", image: "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=600&auto=format&fit=crop&q=60", views: 8900 },
    { id: 6, title: "India's Education Revolution: 2047 Goals", description: "NEP 2020 implementation progress and how India plans to achieve world-class education outcomes by 2047.", author: "Sunita Rao", published_at: "2026-03-06", image: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=600&auto=format&fit=crop&q=60", views: 7600 },
    { id: 7, title: "Zero Poverty India: 2047 Target on Track?", description: "NITI Aayog assesses progress on extreme poverty elimination as India marches towards its 2047 development goals.", author: "Arjun Nair", published_at: "2026-03-05", image: "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=600&auto=format&fit=crop&q=60", views: 11300 },
    { id: 8, title: "India as a Global Soft Power by 2047", description: "How Yoga, Ayurveda, Bollywood and Indian cuisine are building India's soft power credentials globally.", author: "Divya Kapoor", published_at: "2026-03-04", image: "https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=600&auto=format&fit=crop&q=60", views: 9200 },
  ],
  "trending": [
    { id: 1, title: "Why 'Bharat' is Trending on Social Media", description: "The debate over India vs Bharat name controversy goes viral again as Constitution amendment bill is tabled.", author: "Rahul Sharma", published_at: "2026-03-11", image: "https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=600&auto=format&fit=crop&q=60", views: 34200 },
    { id: 2, title: "Coldplay India Tour Tickets Sell Out in Minutes", description: "Coldplay's first India concert in 15 years causes website crashes as millions scramble for tickets.", author: "Priya Mehta", published_at: "2026-03-10", image: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&auto=format&fit=crop&q=60", views: 28700 },
    { id: 3, title: "RCB Finally Wins IPL: Internet Erupts", description: "Royal Challengers Bengaluru end their 17-year IPL trophy drought, causing massive celebrations on social media.", author: "Amit Singh", published_at: "2026-03-09", image: "https://images.unsplash.com/photo-1531415074968-036ba1b575da?w=600&auto=format&fit=crop&q=60", views: 52100 },
    { id: 4, title: "Viral: Street Vendor's Son Cracks UPSC First Attempt", description: "Inspiring story of a street vendor's son from Bihar who cracked UPSC in his first attempt goes viral.", author: "Neha Gupta", published_at: "2026-03-08", image: "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=600&auto=format&fit=crop&q=60", views: 41300 },
    { id: 5, title: "India's Most Watched YouTube Video of 2026", description: "A heartwarming story from a small village in Rajasthan becomes India's most watched YouTube video with 500M views.", author: "Vikram Patel", published_at: "2026-03-07", image: "https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=600&auto=format&fit=crop&q=60", views: 19600 },
    { id: 6, title: "#MakeInIndia Goes Viral as iPhone Plant Opens", description: "Apple's new iPhone manufacturing plant in Chennai triggers massive social media celebration of Indian manufacturing.", author: "Sunita Rao", published_at: "2026-03-06", image: "https://images.unsplash.com/photo-1565514020179-026b92b84bb6?w=600&auto=format&fit=crop&q=60", views: 24800 },
    { id: 7, title: "Ranveer Singh's Dance Video Gets 100M Views in 24 Hrs", description: "Bollywood star Ranveer Singh breaks the internet with a patriotic dance video that goes massively viral.", author: "Arjun Nair", published_at: "2026-03-05", image: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&auto=format&fit=crop&q=60", views: 38400 },
    { id: 8, title: "10 Things Indians Are Googling Most in 2026", description: "Google India reveals its top search trends of 2026 — and the results say a lot about what India cares about.", author: "Divya Kapoor", published_at: "2026-03-04", image: "https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=600&auto=format&fit=crop&q=60", views: 17900 },
  ],
  "60-second-read": [
    { id: 1, title: "India's GDP in 60 Seconds", description: "Everything you need to know about India's latest GDP figures explained simply in under a minute.", author: "Rahul Sharma", published_at: "2026-03-11", image: "https://images.unsplash.com/photo-1543286386-713bdd548da4?w=600&auto=format&fit=crop&q=60", views: 18900 },
    { id: 2, title: "RBI Rate Cut: What It Means For You", description: "The RBI cut rates by 25 bps. Here's what that means for your home loan, FD and savings in 60 seconds.", author: "Priya Mehta", published_at: "2026-03-10", image: "https://images.unsplash.com/photo-1601597111158-2fceff292cdc?w=600&auto=format&fit=crop&q=60", views: 14600 },
    { id: 3, title: "Sensex at 90,000: Should You Invest Now?", description: "Sensex crosses 90,000. Here's a 60-second guide to whether you should enter the market now.", author: "Amit Singh", published_at: "2026-03-09", image: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=600&auto=format&fit=crop&q=60", views: 22300 },
    { id: 4, title: "New Toll Rules: What Drivers Must Know", description: "Government announces new GPS-based toll system. Here's everything drivers need to know in 60 seconds.", author: "Neha Gupta", published_at: "2026-03-08", image: "https://images.unsplash.com/photo-1545558014-8692077e9b5c?w=600&auto=format&fit=crop&q=60", views: 11700 },
    { id: 5, title: "UPI New Rules From April 2026", description: "NPCI announces changes to UPI transaction limits and new features. Read the key changes in 60 seconds.", author: "Vikram Patel", published_at: "2026-03-07", image: "https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=600&auto=format&fit=crop&q=60", views: 16400 },
    { id: 6, title: "Budget 2026 Key Points in 60 Seconds", description: "The Union Budget 2026 had 200+ announcements. Here are the top 10 that matter most to you.", author: "Sunita Rao", published_at: "2026-03-06", image: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600&auto=format&fit=crop&q=60", views: 27800 },
    { id: 7, title: "New Labour Laws: 4 Codes in 60 Seconds", description: "India's 4 new labour codes replace 29 old laws. Here's what workers and employers must know quickly.", author: "Arjun Nair", published_at: "2026-03-05", image: "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=600&auto=format&fit=crop&q=60", views: 13200 },
    { id: 8, title: "EV Policy 2026: What's New in 60 Seconds", description: "Government's revised EV policy brings new subsidies and charging infrastructure mandates. Key points in 60 seconds.", author: "Divya Kapoor", published_at: "2026-03-04", image: "https://images.unsplash.com/photo-1593941707882-a5bba14938c7?w=600&auto=format&fit=crop&q=60", views: 9800 },
  ],
};

// ─────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────
const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "";

const formatViews = (v) => {
  if (!v) return "";
  if (v >= 1000) return `${(v / 1000).toFixed(1)}K`;
  return v.toString();
};

// ─────────────────────────────────────────────
//  CategoryPage
// ─────────────────────────────────────────────
export default function CategoryPage() {
  const { slug } = useParams();
  const [category, setCategory]   = useState(null);
  const [articles, setArticles]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [visibleCount, setVisibleCount] = useState(6);

  useEffect(() => {
    window.scrollTo(0, 0);
    const fetchData = async () => {
      setLoading(true);
      setVisibleCount(6);

      // Category info
      try {
        const res  = await fetch(`${API_BASE}/categories/`);
        const data = await res.json();
        const found = Array.isArray(data) ? data.find((c) => c.slug === slug) : null;
        setCategory(found || { name: slug });
      } catch {
        setCategory({ name: slug });
      }

      // Articles: /api/articles/ se fetch karo, category slug se filter karo
      try {
        const res  = await fetch(`${API_BASE}/articles/`);
        const data = await res.json();
        const all  = Array.isArray(data) ? data : (data.results || []);


        const slugToName = {
          "breaking-news":      "breaking news",
          "states-of-bharat":   "states of bharat",
          "bharat-economy":     "bharat economy & business",
          "bfsi":               "bharat's bfsi",
          "bharat-explainers":  "bharat explainers",
          "bharat-in-numbers":  "bharat in numbers",
          "bharat-opinions":    "bharat opinions",
          "bharats-startups":   "bharat's startups",
          "bharat-2047":        "bharat 2047",
          "technology":         "technology",
          "ai":                 "artificial intelligence",
          "sports":             "sports",
          "world-news":         "world news",
          "trending":           "trending",
          "60-second-read":     "60-second read",
        };

        const filtered = all.filter((article) => {
          const details  = article.category_details || {};
          const catSlug  = (details.slug || "").toLowerCase();
          const catName  = (details.name || "").toLowerCase();
          const mySlug   = slug.toLowerCase();

          // 1. Slug se match karo
          if (catSlug && catSlug === mySlug) return true;

          // 2. Name ko slug mein convert karke match karo
          const nameAsSlug = catName.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
          if (nameAsSlug === mySlug) return true;

          // 3. Slug-to-name map se match karo
          const mappedName = slugToName[mySlug] || "";
          if (mappedName && catName === mappedName) return true;

          return false;
        });

        // Image + author + description normalize karo
        const BASE = "http://127.0.0.1:8000";
        const normalized = filtered.map((a) => {
          const imgRaw = a.image_url || a.image || null;
          const imgFull = imgRaw
            ? (imgRaw.startsWith("http") ? imgRaw : `${BASE}${imgRaw}`)
            : null;
          return {
            ...a,
            image: imgFull,
            author: (typeof a.author === "object" ? a.author?.username : a.author) || "News4Bharat",
            description: a.subtitle || (a.content ? a.content.slice(0, 150) : ""),
          };
        });

        console.log(`[Articles API] Total: ${all.length}, Category "${slug}": ${filtered.length}`);

        // Live data mile toh use karo, warna static dummy
        setArticles(normalized.length > 0 ? normalized : (DUMMY_ARTICLES[slug] || []));
      } catch (err) {
        console.warn("⚠️ [Articles API] Fail — static data use ho raha hai:", err.message);
        setArticles(DUMMY_ARTICLES[slug] || []);
      }

      setLoading(false);
    };
    fetchData();
  }, [slug]);

  const heroArticle    = articles[0] || null;
  const gridArticles   = articles.slice(1, visibleCount + 1);
  const trendingTop5   = [...articles].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 5);
  const hasMore        = visibleCount + 1 < articles.length;

  if (loading) {
    return (
      <div style={S.center}>
        <div style={S.spinner} />
        <p style={S.loadingText}>Loading...</p>
      </div>
    );
  }

  return (
    <div style={S.page}>

      {/* ── Category Header ── */}
      <div style={S.catHeader}>
        <div style={S.catHeaderInner}>
          <div style={S.redLine} />
          <h1 style={S.catTitle}>{category?.name || slug}</h1>
          {category?.description && <p style={S.catDesc}>{category.description}</p>}
          <span style={S.catCount}>
            <BookOpen size={13} style={{ marginRight: 5, verticalAlign: "middle" }} />
            {articles.length} Articles
          </span>
        </div>
      </div>

      <div style={S.pageBody}>

        {/* ══════════ LEFT MAIN CONTENT ══════════ */}
        <div style={S.mainCol}>

          {/* ── Hero Article ── */}
          {heroArticle && (
            <div style={S.hero}>
              <div style={S.heroImgWrap}>
                {heroArticle.image
                  ? <img src={heroArticle.image} alt={heroArticle.title} style={S.heroImg} />
                  : <div style={S.heroImgPlaceholder}><Newspaper size={40} color="#ccc" /></div>
                }
                <div style={S.heroOverlay} />
                <span style={S.heroBadge}>Featured</span>
              </div>
              <div style={S.heroBody}>
                <h2 style={S.heroTitle}>{heroArticle.title}</h2>
                <p style={S.heroDesc}>{heroArticle.description}</p>
                <div style={S.heroMeta}>
                  <span style={S.metaItem}>
                    <User size={12} style={{ marginRight: 4 }} />
                    {heroArticle.author}
                  </span>
                  <span style={S.metaItem}>
                    <Clock size={12} style={{ marginRight: 4 }} />
                    {formatDate(heroArticle.published_at || heroArticle.created_at)}
                  </span>
                  {heroArticle.views && (
                    <span style={S.metaItem}>
                      <Eye size={12} style={{ marginRight: 4 }} />
                      {formatViews(heroArticle.views)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── Section Divider ── */}
          <div style={S.sectionDivider}>
            <span style={S.sectionDividerLabel}>Latest Articles</span>
            <div style={S.sectionDividerLine} />
          </div>

          {/* ── Articles Grid ── */}
          {gridArticles.length === 0 ? (
            <div style={S.empty}>
              <Newspaper size={48} color="#ccc" />
              <p style={{ fontSize: 16, fontWeight: 700, color: "#333", margin: "16px 0 8px" }}>
                Abhi koi article nahi hai
              </p>
              <p style={{ fontSize: 13, color: "#888" }}>Jald hi articles aayenge!</p>
            </div>
          ) : (
            <div style={S.grid}>
              {gridArticles.map((article) => (
                <div
                  key={article.id}
                  style={S.card}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "0 8px 28px rgba(0,0,0,0.11)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 2px 10px rgba(0,0,0,0.07)"; }}
                >
                  <div style={S.cardImgWrap}>
                    {article.image
                      ? <img src={article.image} alt={article.title} style={S.cardImg} />
                      : <div style={S.cardImgPlaceholder}><Newspaper size={28} color="#ccc" /></div>
                    }
                  </div>
                  <div style={S.cardBody}>
                    <h3 style={S.cardTitle}>{article.title}</h3>
                    {article.description && (
                      <p style={S.cardDesc}>{article.description.slice(0, 90)}...</p>
                    )}
                    <div style={S.cardMeta}>
                      <span style={S.metaItem}>
                        <User size={11} style={{ marginRight: 3 }} />
                        {article.author}
                      </span>
                      <span style={S.metaItem}>
                        <Clock size={11} style={{ marginRight: 3 }} />
                        {formatDate(article.published_at || article.created_at)}
                      </span>
                    </div>
                    {article.views && (
                      <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 4 }}>
                        <Eye size={11} color="#D80100" />
                        <span style={{ fontSize: 11, color: "#D80100", fontWeight: 600 }}>
                          {formatViews(article.views)} views
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── Load More ── */}
          {hasMore && (
            <div style={{ textAlign: "center", marginTop: 32 }}>
              <button
                style={S.loadMoreBtn}
                onClick={() => setVisibleCount((p) => p + 6)}
                onMouseEnter={(e) => { e.currentTarget.style.background = "#b30000"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "#D80100"; }}
              >
                <RefreshCw size={14} style={{ marginRight: 8 }} />
                Load More Articles
              </button>
            </div>
          )}
        </div>

        {/* ══════════ RIGHT SIDEBAR ══════════ */}
        <aside style={S.sidebar}>

          {/* Trending */}
          <div style={S.sideWidget}>
            <div style={S.widgetHead}>
              <TrendingUp size={15} color="#D80100" style={{ marginRight: 7 }} />
              <span>Trending Now</span>
            </div>
            <div style={S.widgetBody}>
              {trendingTop5.map((article, idx) => (
                <div key={article.id} style={S.trendItem}>
                  <span style={S.trendNum}>{String(idx + 1).padStart(2, "0")}</span>
                  <div style={S.trendContent}>
                    <p style={S.trendTitle}>{article.title}</p>
                    <span style={S.trendMeta}>
                      <Eye size={10} style={{ marginRight: 3 }} />
                      {formatViews(article.views)} views
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Latest */}
          <div style={S.sideWidget}>
            <div style={S.widgetHead}>
              <Clock size={15} color="#D80100" style={{ marginRight: 7 }} />
              <span>Latest</span>
            </div>
            <div style={S.widgetBody}>
              {articles.slice(0, 4).map((article) => (
                <div key={article.id} style={S.latestItem}>
                  <div style={S.latestImgWrap}>
                    {article.image
                      ? <img src={article.image} alt={article.title} style={S.latestImg} />
                      : <div style={{ ...S.latestImg, background: "#f0ece8", display: "flex", alignItems: "center", justifyContent: "center" }}><Newspaper size={16} color="#ccc" /></div>
                    }
                  </div>
                  <div style={S.latestContent}>
                    <p style={S.latestTitle}>{article.title}</p>
                    <span style={S.latestDate}>
                      <Clock size={10} style={{ marginRight: 3 }} />
                      {formatDate(article.published_at || article.created_at)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Newsletter CTA */}
          <div style={S.newsletter}>
            <div style={S.newsletterIcon}>
              <Newspaper size={22} color="#fff" />
            </div>
            <h4 style={S.newsletterTitle}>Stay Updated</h4>
            <p style={S.newsletterText}>
              Get the latest {category?.name || "news"} delivered to your inbox daily.
            </p>
            <button
              style={S.newsletterBtn}
              onMouseEnter={(e) => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.color = "#D80100"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#fff"; }}
            >
              Subscribe Now
              <ChevronRight size={14} style={{ marginLeft: 6 }} />
            </button>
          </div>

        </aside>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
//  Styles
// ─────────────────────────────────────────────
const S = {
  page:       { minHeight: "100vh", background: "#f7f4f0", fontFamily: "Poppins, sans-serif" },

  // Header
  catHeader:      { background: "#fff", borderBottom: "3px solid #D80100", padding: "28px 0 20px" },
  catHeaderInner: { maxWidth: 1240, margin: "0 auto", padding: "0 24px" },
  catTitle:       { fontSize: "clamp(20px, 3.5vw, 34px)", fontWeight: 800, color: "#111", margin: "0 0 6px", letterSpacing: "-0.4px" },
  catDesc:        { fontSize: 13, color: "#666", margin: "0 0 8px", lineHeight: 1.6 },
  catCount:       { fontSize: 12, color: "#D80100", fontWeight: 600, display: "inline-flex", alignItems: "center" },

  // Layout
  pageBody: { maxWidth: 1240, margin: "0 auto", padding: "28px 24px", display: "grid", gridTemplateColumns: "1fr 320px", gap: 28, alignItems: "start" },
  mainCol:  { minWidth: 0 },
  sidebar:  { display: "flex", flexDirection: "column", gap: 20 },

  // Hero
  hero:            { background: "#fff", borderRadius: 12, overflow: "hidden", boxShadow: "0 2px 14px rgba(0,0,0,0.08)", marginBottom: 28 },
  heroImgWrap:     { position: "relative", width: "100%", height: 320, overflow: "hidden" },
  heroImg:         { width: "100%", height: "100%", objectFit: "cover" },
  heroImgPlaceholder: { width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#f0ece8" },
  heroOverlay:     { position: "absolute", bottom: 0, left: 0, right: 0, height: "50%", background: "linear-gradient(to top, rgba(0,0,0,0.3), transparent)" },
  heroBadge:       { position: "absolute", top: 14, left: 14, background: "#D80100", color: "#fff", fontSize: 10, fontWeight: 700, padding: "4px 10px", borderRadius: 4, textTransform: "uppercase", letterSpacing: "1px" },
  heroBody:        { padding: "20px 24px 24px" },
  heroTitle:       { fontSize: "clamp(16px, 2.5vw, 22px)", fontWeight: 800, color: "#111", margin: "0 0 10px", lineHeight: 1.4, letterSpacing: "-0.3px" },
  heroDesc:        { fontSize: 13.5, color: "#555", margin: "0 0 14px", lineHeight: 1.7 },
  heroMeta:        { display: "flex", gap: 16, flexWrap: "wrap" },

  // Meta
  metaItem: { display: "inline-flex", alignItems: "center", fontSize: 11.5, color: "#888", fontWeight: 500 },

  // Section divider
  sectionDivider:      { display: "flex", alignItems: "center", gap: 12, marginBottom: 20 },
  sectionDividerLabel: { fontSize: 13, fontWeight: 700, color: "#D80100", whiteSpace: "nowrap", textTransform: "uppercase", letterSpacing: "0.8px" },
  sectionDividerLine:  { flex: 1, height: 1, background: "#e8e4df" },

  // Grid
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 20 },

  // Card
  card:            { background: "#fff", borderRadius: 10, overflow: "hidden", boxShadow: "0 2px 10px rgba(0,0,0,0.07)", transition: "transform 0.2s, box-shadow 0.2s", cursor: "pointer" },
  cardImgWrap:     { width: "100%", height: 170, overflow: "hidden", background: "#f0ece8" },
  cardImg:         { width: "100%", height: "100%", objectFit: "cover", transition: "transform 0.3s" },
  cardImgPlaceholder: { width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#f8f4f0" },
  cardBody:        { padding: "14px 16px 16px" },
  cardTitle:       { fontSize: 13.5, fontWeight: 700, color: "#111", margin: "0 0 7px", lineHeight: 1.5 },
  cardDesc:        { fontSize: 12, color: "#666", margin: "0 0 10px", lineHeight: 1.6 },
  cardMeta:        { display: "flex", flexWrap: "wrap", gap: 10 },

  // Load more
  loadMoreBtn: { display: "inline-flex", alignItems: "center", background: "#D80100", color: "#fff", border: "none", borderRadius: 7, padding: "11px 28px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "Poppins, sans-serif", transition: "background 0.2s" },

  // Sidebar widgets
  sideWidget: { background: "#fff", borderRadius: 10, overflow: "hidden", boxShadow: "0 2px 10px rgba(0,0,0,0.06)" },
  widgetHead: { display: "flex", alignItems: "center", padding: "14px 16px", borderBottom: "2px solid #D80100", fontSize: 13, fontWeight: 700, color: "#111", textTransform: "uppercase", letterSpacing: "0.5px" },
  widgetBody: { padding: "8px 0" },

  // Trending
  trendItem:    { display: "flex", alignItems: "flex-start", gap: 12, padding: "10px 16px", borderBottom: "1px solid #f5f2ef", cursor: "pointer" },
  trendNum:     { fontSize: 18, fontWeight: 800, color: "#e8ddd5", lineHeight: 1, minWidth: 24 },
  trendContent: { flex: 1 },
  trendTitle:   { fontSize: 12.5, fontWeight: 600, color: "#222", margin: "0 0 4px", lineHeight: 1.5 },
  trendMeta:    { display: "inline-flex", alignItems: "center", fontSize: 11, color: "#aaa" },

  // Latest
  latestItem:    { display: "flex", gap: 10, padding: "10px 16px", borderBottom: "1px solid #f5f2ef", cursor: "pointer" },
  latestImgWrap: { flexShrink: 0, width: 64, height: 48, borderRadius: 6, overflow: "hidden" },
  latestImg:     { width: "100%", height: "100%", objectFit: "cover" },
  latestContent: { flex: 1 },
  latestTitle:   { fontSize: 12, fontWeight: 600, color: "#222", margin: "0 0 5px", lineHeight: 1.5 },
  latestDate:    { display: "inline-flex", alignItems: "center", fontSize: 10.5, color: "#aaa" },

  // Newsletter
  newsletter:       { background: "linear-gradient(135deg, #D80100 0%, #9a0000 100%)", borderRadius: 10, padding: "24px 20px", textAlign: "center" },
  newsletterIcon:   { width: 44, height: 44, borderRadius: "50%", background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" },
  newsletterTitle:  { fontSize: 15, fontWeight: 700, color: "#fff", margin: "0 0 8px" },
  newsletterText:   { fontSize: 12, color: "rgba(255,255,255,0.8)", margin: "0 0 16px", lineHeight: 1.5 },
  newsletterBtn:    { display: "inline-flex", alignItems: "center", background: "transparent", color: "#fff", border: "1.5px solid rgba(255,255,255,0.7)", borderRadius: 6, padding: "9px 20px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "Poppins, sans-serif", transition: "all 0.2s" },

  // States
  empty:       { textAlign: "center", padding: "60px 0", display: "flex", flexDirection: "column", alignItems: "center" },
  center:      { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh" },
  spinner:     { width: 36, height: 36, border: "3px solid #f0ece8", borderTop: "3px solid #D80100", borderRadius: "50%", marginBottom: 12 },
  loadingText: { color: "#888", fontSize: 13, fontFamily: "Poppins, sans-serif" },
};
import React from 'react';
import '../App.css';

function CategorySection() {
  const categories = [
    {
      name: "Politics",
      icon: "🏛️",
      articles: [
        { title: "Parliamentary Session Addresses Key Reforms", time: "2h ago" },
        { title: "Election Commission Announces New Guidelines", time: "5h ago" },
        { title: "Opposition Demands Policy Transparency", time: "7h ago" }
      ]
    },
    {
      name: "Technology",
      icon: "💻",
      articles: [
        { title: "Quantum Computing Reaches New Milestone", time: "1h ago" },
        { title: "Cybersecurity Threats on the Rise", time: "4h ago" },
        { title: "5G Networks Expand to Rural Areas", time: "6h ago" }
      ]
    },
    {
      name: "Entertainment",
      icon: "🎬",
      articles: [
        { title: "Award Season: Complete Winners List", time: "3h ago" },
        { title: "Streaming Wars: New Players Enter Market", time: "5h ago" },
        { title: "Music Festival Announces Star-Studded Lineup", time: "8h ago" }
      ]
    },
    {
      name: "Lifestyle",
      icon: "🌟",
      articles: [
        { title: "Sustainable Living: Expert Tips for 2026", time: "2h ago" },
        { title: "Wellness Trends That Actually Work", time: "4h ago" },
        { title: "Urban Gardening Transforms City Spaces", time: "9h ago" }
      ]
    }
  ];

  return (
    <section className="category-section">
      <h2 className="section-title">Explore by Category</h2>
      <div className="categories-grid">
        {categories.map((category, index) => (
          <div key={index} className="category-card">
            <div className="category-header">
              <span className="category-icon">{category.icon}</span>
              <h3>{category.name}</h3>
            </div>
            <div className="category-articles">
              {category.articles.map((article, idx) => (
                <div key={idx} className="category-article">
                  <h4>{article.title}</h4>
                  <span className="article-time">{article.time}</span>
                </div>
              ))}
            </div>
            <a href={`#${category.name.toLowerCase()}`} className="category-link">
              View All {category.name} →
            </a>
          </div>
        ))}
      </div>
    </section>
  );
}

export default CategorySection;
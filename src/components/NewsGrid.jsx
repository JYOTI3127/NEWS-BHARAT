import React from 'react';
import '../App.css';

function NewsGrid() {
  const newsArticles = [
    {
      id: 1,
      title: "Breakthrough in Renewable Energy Storage Technology",
      description: "Scientists develop new battery system that could revolutionize clean energy infrastructure.",
      image: "https://images.unsplash.com/photo-1509391366360-2e959784a276?w=500&h=300&fit=crop",
      category: "Science",
      author: "Dr. James Chen",
      date: "4 hours ago",
      featured: true
    },
    {
      id: 2,
      title: "Markets React to Federal Reserve Decision",
      description: "Stock indices show mixed response as central bank announces new monetary policy.",
      image: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=500&h=300&fit=crop",
      category: "Finance",
      author: "Emily Roberts",
      date: "6 hours ago"
    },
    {
      id: 3,
      title: "Historic Peace Agreement Signed in Middle East",
      description: "Regional leaders commit to comprehensive framework for lasting stability.",
      image: "https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=500&h=300&fit=crop",
      category: "World",
      author: "Michael Torres",
      date: "7 hours ago"
    },
    {
      id: 4,
      title: "AI Revolution Transforms Healthcare Diagnosis",
      description: "New machine learning models achieve unprecedented accuracy in early disease detection.",
      image: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=500&h=300&fit=crop",
      category: "Health",
      author: "Dr. Lisa Wang",
      date: "8 hours ago"
    },
    {
      id: 5,
      title: "Championship Finals Draw Record Viewership",
      description: "Historic sports event captivates global audience with thrilling competition.",
      image: "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=500&h=300&fit=crop",
      category: "Sports",
      author: "David Martinez",
      date: "10 hours ago"
    },
    // {
    //   id: 6,
    //   title: "Space Agency Announces Mission to Mars",
    //   description: "Ambitious project aims to establish first permanent human presence on red planet.",
    //   image: "https://images.unsplash.com/photo-1446776653964-20c1d3a81b06?w=500&h=300&fit=crop",
    //   category: "Space",
    //   author: "Rachel Kim",
    //   date: "12 hours ago"
    // }
  ];

  return (
    <section className="news-grid-section">
      <div className="section-header">
        <h2>Latest News</h2>
        <a href="#all-news" className="view-all">View All →</a>
      </div>
      
      <div className="news-grid">
        {newsArticles.map((article) => (
          <article key={article.id} className={`news-card ${article.featured ? 'featured' : ''}`}>
            <div className="card-image">
              <img src={article.image} alt={article.title} />
              <span className="card-category">{article.category}</span>
            </div>
            <div className="card-content">
              <h3>{article.title}</h3>
              <p>{article.description}</p>
              <div className="card-meta">
                <span className="card-author">{article.author}</span>
                <span className="card-date">{article.date}</span>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export default NewsGrid;
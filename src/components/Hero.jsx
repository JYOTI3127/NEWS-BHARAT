import React from 'react';
import '../App.css';

function Hero() {
  const mainStory = {
    title: "Global Leaders Convene for Historic Climate Summit",
    description: "World leaders gather in unprecedented numbers to address critical environmental challenges and forge new international agreements for sustainable future.",
    image: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200&h=600&fit=crop",
    category: "World",
    author: "Sarah Mitchell",
    date: "2 hours ago",
    readTime: "5 min read"
  };

  const sideStories = [
    {
      title: "Tech Giants Announce Revolutionary AI Partnership",
      image: "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=400&h=250&fit=crop",
      category: "Technology",
      date: "3 hours ago"
    },
    {
      title: "Economic Recovery Shows Strong Momentum",
      image: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=400&h=250&fit=crop",
      category: "Business",
      date: "5 hours ago"
    }
  ];

  return (
    <section className="hero">
      <div className="hero-container">
        <div className="main-story">
          <div className="story-image">
            <img src={mainStory.image} alt={mainStory.title} />
            <span className="category-badge">{mainStory.category}</span>
          </div>
          <div className="story-content">
            <h1>{mainStory.title}</h1>
            <p>{mainStory.description}</p>
            <div className="story-meta">
              <span className="author">By {mainStory.author}</span>
              <span className="separator">•</span>
              <span className="date">{mainStory.date}</span>
              <span className="separator">•</span>
              <span className="read-time">{mainStory.readTime}</span>
            </div>
            <button className="read-more">Read Full Story →</button>
          </div>
        </div>

        <div className="side-stories">
          {sideStories.map((story, index) => (
            <div key={index} className="side-story">
              <img src={story.image} alt={story.title} />
              <div className="side-story-content">
                <span className="mini-category">{story.category}</span>
                <h3>{story.title}</h3>
                <span className="mini-date">{story.date}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default Hero;
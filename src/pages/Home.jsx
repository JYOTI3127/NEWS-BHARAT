import React from 'react'
import NewsBanner from '../components/Banner'
import TrendingNews from '../components/Trendingnews'
import VideoSection from '../components/Video'
import NewsPortalSection from '../components/Newsportalsection'
import StateNews from '../components/Statenews'
import Newsletter from "../components/Newsletter";
import VisualStoriesWithScore from '../components/Visualstories'
import HomeCategorySections from '../components/HomeCategorySections';
import MoreStoriesSection from '../components/MoreStoriesSection';

const Home = () => {
  return (
    <>
      <NewsBanner />
      <TrendingNews />
      {/* <VideoSection /> */}
      <VisualStoriesWithScore />
      <NewsPortalSection />
      <StateNews />
      <HomeCategorySections />
      <MoreStoriesSection />
      
       {/* <Newsletter /> */}
    </>
  )
}

export default Home

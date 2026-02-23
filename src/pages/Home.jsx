import React from 'react'
import NewsBanner from '../components/Banner'
import TrendingNews from '../components/Trendingnews'
import VideoSection from '../components/Video'
import NewsPortalSection from '../components/Newsportalsection'
import StateNews from '../components/Statenews'

const Home = () => {
  return (
    
    <>
       <NewsBanner />
       <TrendingNews/>
        <VideoSection />
        <NewsPortalSection />
         <StateNews />
    
    </>
  )
}

export default Home
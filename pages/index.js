import Feature from "../components/marketing/Feature";
import Pricing from "../components/marketing/Pricing";
import Hero from "../components/marketing/Hero";
import Layout from "../components/Layout/Layout";
import SeoHead from "../components/marketing/SeoHead";
import Catalogo from "../components/marketing/Catalogo";

export default function Home() {
  return (
    <>
      <SeoHead title='Jorge Minnesota Logistic LLC' />
      <Layout>
        <Hero />
        <Catalogo/>
        {/*<Feature />*/}
        {/*<Pricing />*/}
      </Layout>
        .
    </>
  );
}

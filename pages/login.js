import Layout from "../components/Layout/Layout";
import SeoHead from "../components/SeoHead";
import Login001 from "../components/Login/Login";

export default function Home() {
  return (
    <>
      <SeoHead title='Jorge Minnesota Logistic LLC' />
        <Layout >
          <Login001 />
        </Layout>
    </>
  );
}

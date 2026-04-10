import Layout from "../components/Layout/Layout";
import SeoHead from "../components/marketing/SeoHead";
import Login001 from "../components/auth/Login";

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

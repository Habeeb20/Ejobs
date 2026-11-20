// import { Outlet } from "react-router-dom";
// import Navbar from "./Navbar"; // your existing navbar (remove if you don't have one)
// import Footer from "./Footer";


// export default function Layout() {
//   return (
//     <div className="flex  flex-col">
//       <Navbar />
//       {/* flex-1 makes the page area take all leftover height, pushing the footer down */}
//       <main className="flex-1">
//         <Outlet />
//       </main>
//       {/* <Footer /> */}
//     </div>
//   );
// }

import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";
// import Footer from "./Footer";

/**
 * Navbar is fixed to the top of the screen (it never scrolls with the content).
 * It renders its own spacer that is exactly as tall as the navbar, so the page
 * starts directly under it with no gap.
 */
export default function Layout() {
  return (
    <div className="flex flex-col">
  
      {/* flex-1 makes the page area take all leftover height, pushing the footer down */}
      <main className="flex-1">
        <Outlet />
      </main>
      {/* <Footer /> */}
    </div>
  );
}
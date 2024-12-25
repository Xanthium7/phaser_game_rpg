import Image from "next/image";
import React from "react";
import { motion } from "motion/react";

const Features = ({
  ltr,
  text,
  img,
  textSize,
}: {
  ltr: boolean;
  text: string;
  img: string;
  textSize: string;
}) => {
  return (
    <div className="flex flex-col bg-black justify-center items-center h-screen">
      <div className="flex  w-full h-full justify-center items-center">
        {ltr ? (
          <>
            {/* LHS */}
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{
                duration: 0.4,
                delay: 0.5,
                ease: "easeIn",
              }}
              viewport={{ once: true }}
              className="w-1/2 h-3/4"
            >
              <div className="flex flex-col text-center justify-center items-center h-full">
                <p className={` ${textSize} text-right text-white p-20`}>
                  {text}
                </p>
              </div>
            </motion.div>
            {/* RHS */}
            <div className="flex justify-center items-center overflow-hidden w-1/2 h-3/4">
              <div className="w-fit-content h-fit-content  overflow-hidden">
                <motion.div
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  transition={{
                    duration: 0.4,
                    delay: 0.5,
                    ease: "easeIn",
                  }}
                  viewport={{ once: true }}
                  className=""
                >
                  <Image
                    width={400}
                    height={400}
                    className="rounded-xl object-center object-cover w-[40vw] h-[50vh]"
                    src={img}
                    alt=""
                  />
                </motion.div>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* RHS */}
            <div className="flex justify-center items-center overflow-hidden w-1/2 h-3/4">
              <div className="w-fit-content h-fit-content  overflow-hidden">
                <motion.div
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  transition={{
                    duration: 0.4,
                    delay: 0.5,
                    ease: "easeIn",
                  }}
                  viewport={{ once: true }}
                  className=""
                >
                  <Image
                    width={400}
                    height={400}
                    className="rounded-xl object-center object-cover w-[40vw] h-[50vh]"
                    src={img}
                    alt=""
                  />
                </motion.div>
              </div>
            </div>
            {/* LHS */}
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{
                duration: 0.4,
                delay: 0.5,
                ease: "easeIn",
              }}
              viewport={{ once: true }}
              className="w-1/2 h-3/4"
            >
              <div className="flex flex-col text-center justify-center items-center h-full">
                <p className={` ${textSize} text-left text-white p-20`}>
                  {text}
                </p>
              </div>
            </motion.div>
          </>
        )}
      </div>
    </div>
  );
};

export default Features;
